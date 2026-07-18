//! Embedded MCP server (Model Context Protocol, Streamable HTTP transport).
//!
//! Runs in the background inside the app process and exposes Marco Polo's
//! travel capabilities as MCP tools, so any MCP-capable AI client — Claude,
//! ChatGPT/OpenAI, Grok, Kimi, Cursor, … — can search flights and hotels
//! through this app. Stateless JSON-RPC 2.0 over POST, bound to localhost
//! only. Default port 1254 (Marco Polo's birth year); override with
//! `MARCOPOLO_MCP_PORT`.

use axum::http::{HeaderValue, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::post;
use axum::{extract::State, Json, Router};
use serde_json::{json, Value};

use crate::tools::{self, ToolContext};

pub const DEFAULT_PORT: u16 = 1254;

pub fn port() -> u16 {
    std::env::var("MARCOPOLO_MCP_PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(DEFAULT_PORT)
}

pub fn endpoint() -> String {
    format!("http://127.0.0.1:{}/mcp", port())
}

pub type McpState = ToolContext;

pub async fn serve(state: McpState) {
    let app = Router::new()
        .route("/mcp", post(handle_post).options(handle_options))
        .with_state(state);
    let addr = std::net::SocketAddr::from(([127, 0, 0, 1], port()));
    match tokio::net::TcpListener::bind(addr).await {
        Ok(listener) => {
            log::info!("MCP server listening on http://{addr}/mcp");
            if let Err(e) = axum::serve(listener, app).await {
                log::warn!("MCP server stopped: {e}");
            }
        }
        Err(e) => log::warn!("MCP server could not bind {addr}: {e}"),
    }
}

fn with_cors(mut response: Response) -> Response {
    let headers = response.headers_mut();
    headers.insert("Access-Control-Allow-Origin", HeaderValue::from_static("*"));
    headers.insert(
        "Access-Control-Allow-Methods",
        HeaderValue::from_static("POST, OPTIONS"),
    );
    headers.insert(
        "Access-Control-Allow-Headers",
        HeaderValue::from_static(
            "content-type, authorization, mcp-session-id, mcp-protocol-version",
        ),
    );
    response
}

async fn handle_options() -> Response {
    with_cors(StatusCode::NO_CONTENT.into_response())
}

async fn handle_post(State(state): State<McpState>, Json(request): Json<Value>) -> Response {
    // JSON-RPC notifications (no id) get a bodyless 202 per the MCP spec.
    if request.get("id").is_none() {
        return with_cors(StatusCode::ACCEPTED.into_response());
    }
    let response = handle_request(&state, &request).await;
    with_cors(Json(response).into_response())
}

fn ok(id: Value, result: Value) -> Value {
    json!({ "jsonrpc": "2.0", "id": id, "result": result })
}

fn error(id: Value, code: i64, message: &str) -> Value {
    json!({ "jsonrpc": "2.0", "id": id, "error": { "code": code, "message": message } })
}

pub async fn handle_request(state: &McpState, request: &Value) -> Value {
    let id = request.get("id").cloned().unwrap_or(Value::Null);
    let method = request.get("method").and_then(|m| m.as_str()).unwrap_or("");
    let params = request.get("params").cloned().unwrap_or_else(|| json!({}));

    match method {
        "initialize" => {
            let protocol = params
                .get("protocolVersion")
                .and_then(|v| v.as_str())
                .unwrap_or("2025-06-18");
            ok(
                id,
                json!({
                    "protocolVersion": protocol,
                    "capabilities": { "tools": {} },
                    "serverInfo": {
                        "name": "marco-polo",
                        "title": "Marco Polo Travel",
                        "version": env!("CARGO_PKG_VERSION"),
                    },
                    "instructions": "Marco Polo exposes live travel search. Use search_flights for flight offers, search_hotels for stays, and search_locations to resolve city or airport names into IATA codes first when unsure.",
                }),
            )
        }
        "ping" => ok(id, json!({})),
        "tools/list" => ok(id, json!({ "tools": tool_definitions() })),
        "tools/call" => {
            let name = params.get("name").and_then(|n| n.as_str()).unwrap_or("");
            let arguments = params
                .get("arguments")
                .cloned()
                .unwrap_or_else(|| json!({}));
            match tools::call(state, name, arguments).await {
                Ok(text) => ok(
                    id,
                    json!({ "content": [{ "type": "text", "text": text }], "isError": false }),
                ),
                Err(message) => ok(
                    id,
                    json!({ "content": [{ "type": "text", "text": message }], "isError": true }),
                ),
            }
        }
        _ => error(id, -32601, &format!("method not found: {method}")),
    }
}

fn tool_definitions() -> Value {
    Value::Array(
        tools::definitions()
            .into_iter()
            .map(|tool| {
                json!({
                    "name": tool.name,
                    "title": tool.title,
                    "description": tool.description,
                    "inputSchema": tool.schema,
                })
            })
            .collect(),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    use std::sync::Arc;

    use crate::duffel::DuffelClient;
    use crate::liteapi::LiteApiClient;

    fn demo_state() -> McpState {
        McpState {
            flights: Arc::new(DuffelClient::unconfigured()),
            hotels: Arc::new(LiteApiClient::unconfigured()),
        }
    }

    #[tokio::test]
    async fn initialize_reports_tools_capability() {
        let response = handle_request(
            &demo_state(),
            &json!({ "jsonrpc": "2.0", "id": 1, "method": "initialize",
                     "params": { "protocolVersion": "2025-06-18" } }),
        )
        .await;
        assert_eq!(response["result"]["protocolVersion"], "2025-06-18");
        assert_eq!(response["result"]["serverInfo"]["name"], "marco-polo");
        assert!(response["result"]["capabilities"]["tools"].is_object());
    }

    #[tokio::test]
    async fn tools_list_exposes_all_tools() {
        let response = handle_request(
            &demo_state(),
            &json!({ "jsonrpc": "2.0", "id": 2, "method": "tools/list" }),
        )
        .await;
        let tools = response["result"]["tools"].as_array().unwrap();
        let names: Vec<&str> = tools.iter().filter_map(|t| t["name"].as_str()).collect();
        assert_eq!(
            names,
            vec![
                "search_flights",
                "search_hotels",
                "search_experiences",
                "search_locations"
            ]
        );
    }

    #[tokio::test]
    async fn tools_call_search_flights_returns_offers_json() {
        let response = handle_request(
            &demo_state(),
            &json!({ "jsonrpc": "2.0", "id": 3, "method": "tools/call",
                     "params": { "name": "search_flights", "arguments": {
                         "origin": "JFK", "destination": "LHR",
                         "departureDate": "2026-08-17", "adults": 1 } } }),
        )
        .await;
        assert_eq!(response["result"]["isError"], false);
        let text = response["result"]["content"][0]["text"].as_str().unwrap();
        let parsed: Value = serde_json::from_str(text).unwrap();
        assert_eq!(parsed["demo"], true);
        assert!(!parsed["offers"].as_array().unwrap().is_empty());
    }

    #[tokio::test]
    async fn unknown_method_returns_json_rpc_error() {
        let response = handle_request(
            &demo_state(),
            &json!({ "jsonrpc": "2.0", "id": 4, "method": "resources/list" }),
        )
        .await;
        assert_eq!(response["error"]["code"], -32601);
    }
}
