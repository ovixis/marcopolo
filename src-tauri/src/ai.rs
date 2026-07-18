//! Ask Marco — the built-in travel-aggregator chat agent.
//!
//! The user connects their own LLM (Claude, OpenAI, Grok, Kimi, or any
//! OpenAI-compatible endpoint) with their own API key; the agent loop runs
//! here in Rust, calling the shared travel tools (flights, hotels,
//! experiences, locations) and streaming progress events to the UI.

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::ipc::Channel;

use crate::tools::{self, ToolContext};

const MAX_TOOL_ROUNDS: usize = 6;
const SYSTEM_PROMPT: &str = "You are Marco Polo, the travel-planning agent inside the open-source Marco Polo desktop app. You aggregate real travel data through your tools: search_flights (Duffel), search_hotels (LiteAPI), search_experiences, and search_locations.\n\nRules:\n- When the user names a city rather than an airport code, call search_locations first.\n- For trip requests, search flights AND hotels (and experiences when relevant), then compose a coherent day-by-day itinerary.\n- Always end trip plans with a budget summary table: flights + stay + experiences, totals per person and overall, in one currency.\n- If any tool result has `demo: true`, tell the user those numbers are sample data (it means no API key is configured for that provider).\n- Be concise and concrete: real prices, real times, real names from the tool results — never invent offers.\n- Answer in the language the user writes in.";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatRequest {
    /// "anthropic" | "openai" | "grok" | "kimi" | "custom"
    pub provider: String,
    pub model: String,
    pub api_key: String,
    /// Base URL for "custom" (OpenAI-compatible) providers.
    pub base_url: Option<String>,
    pub messages: Vec<ChatMessage>,
}

#[derive(Deserialize, Serialize, Clone)]
pub struct ChatMessage {
    /// "user" | "assistant"
    pub role: String,
    pub content: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase", tag = "type")]
pub enum ChatEvent {
    ToolStart { name: String, summary: String },
    ToolEnd { name: String, ok: bool },
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatReply {
    pub text: String,
    pub tools_used: Vec<String>,
}

fn emit(channel: &Channel<ChatEvent>, event: ChatEvent) {
    let _ = channel.send(event);
}

/// One-line human summary of a tool call for the UI activity feed.
fn summarize_call(name: &str, args: &Value) -> String {
    let s = |k: &str| args.get(k).and_then(|v| v.as_str()).unwrap_or("?");
    match name {
        "search_flights" => format!(
            "{} → {} · {}",
            s("origin"),
            s("destination"),
            s("departureDate")
        ),
        "search_hotels" => format!("{} · {} → {}", s("city"), s("checkIn"), s("checkOut")),
        "search_experiences" => s("city").to_owned(),
        "search_locations" => s("keyword").to_owned(),
        _ => String::new(),
    }
}

pub async fn chat(
    context: &ToolContext,
    request: ChatRequest,
    channel: Channel<ChatEvent>,
) -> Result<ChatReply, String> {
    if request.api_key.trim().is_empty() {
        return Err("No API key set. Connect a model first.".to_owned());
    }
    let http = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(180))
        .build()
        .map_err(|e| e.to_string())?;

    match request.provider.as_str() {
        "anthropic" => anthropic_loop(context, &http, request, channel).await,
        "openai" | "grok" | "kimi" | "custom" => {
            openai_loop(context, &http, request, channel).await
        }
        other => Err(format!("unknown provider: {other}")),
    }
}

fn openai_base_url(request: &ChatRequest) -> Result<String, String> {
    let url = match request.provider.as_str() {
        "openai" => "https://api.openai.com/v1".to_owned(),
        "grok" => "https://api.x.ai/v1".to_owned(),
        "kimi" => "https://api.moonshot.ai/v1".to_owned(),
        "custom" => request
            .base_url
            .clone()
            .filter(|u| !u.trim().is_empty())
            .ok_or("custom provider needs a base URL")?,
        other => return Err(format!("not an OpenAI-compatible provider: {other}")),
    };
    Ok(url.trim_end_matches('/').to_owned())
}

async fn provider_error_text(response: reqwest::Response) -> String {
    let status = response.status().as_u16();
    let hint = match status {
        401 | 403 => " (check your API key)",
        404 => " (check the model name)",
        429 => " (rate limited — try again in a moment)",
        _ => "",
    };
    let detail = response
        .json::<Value>()
        .await
        .ok()
        .and_then(|body| {
            body.pointer("/error/message")
                .or_else(|| body.pointer("/message"))
                .and_then(|v| v.as_str())
                .map(str::to_owned)
        })
        .unwrap_or_default();
    format!("Model API error HTTP {status}{hint}: {detail}")
}

// ---------------------------------------------------------------------------
// Anthropic Messages API
// ---------------------------------------------------------------------------

pub fn anthropic_tools() -> Value {
    Value::Array(
        tools::definitions()
            .into_iter()
            .map(|tool| {
                json!({
                    "name": tool.name,
                    "description": tool.description,
                    "input_schema": tool.schema,
                })
            })
            .collect(),
    )
}

async fn anthropic_loop(
    context: &ToolContext,
    http: &reqwest::Client,
    request: ChatRequest,
    channel: Channel<ChatEvent>,
) -> Result<ChatReply, String> {
    let mut messages: Vec<Value> = request
        .messages
        .iter()
        .map(|m| json!({ "role": m.role, "content": m.content }))
        .collect();
    let mut tools_used = Vec::new();

    for _ in 0..=MAX_TOOL_ROUNDS {
        let response = http
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", request.api_key.trim())
            .header("anthropic-version", "2023-06-01")
            .json(&json!({
                "model": request.model,
                "max_tokens": 8000,
                "system": SYSTEM_PROMPT,
                "tools": anthropic_tools(),
                "messages": messages,
            }))
            .send()
            .await
            .map_err(|e| format!("network error: {e}"))?;

        if !response.status().is_success() {
            return Err(provider_error_text(response).await);
        }
        let body: Value = response.json().await.map_err(|e| e.to_string())?;
        let content = body["content"].as_array().cloned().unwrap_or_default();
        let stop_reason = body["stop_reason"].as_str().unwrap_or("");

        if stop_reason != "tool_use" {
            let text = content
                .iter()
                .filter_map(|block| block["text"].as_str())
                .collect::<Vec<_>>()
                .join("\n");
            return Ok(ChatReply { text, tools_used });
        }

        // Execute every tool_use block, then continue the conversation.
        let mut results = Vec::new();
        for block in &content {
            if block["type"] == "tool_use" {
                let name = block["name"].as_str().unwrap_or("").to_owned();
                let args = block["input"].clone();
                emit(
                    &channel,
                    ChatEvent::ToolStart {
                        name: name.clone(),
                        summary: summarize_call(&name, &args),
                    },
                );
                let outcome = tools::call(context, &name, args).await;
                emit(
                    &channel,
                    ChatEvent::ToolEnd {
                        name: name.clone(),
                        ok: outcome.is_ok(),
                    },
                );
                tools_used.push(name);
                let (text, is_error) = match outcome {
                    Ok(text) => (text, false),
                    Err(message) => (message, true),
                };
                results.push(json!({
                    "type": "tool_result",
                    "tool_use_id": block["id"],
                    "content": text,
                    "is_error": is_error,
                }));
            }
        }
        messages.push(json!({ "role": "assistant", "content": content }));
        messages.push(json!({ "role": "user", "content": results }));
    }
    Err(
        "The agent hit the tool-call limit without finishing. Try a more specific question."
            .to_owned(),
    )
}

// ---------------------------------------------------------------------------
// OpenAI-compatible chat completions (OpenAI, Grok/xAI, Kimi/Moonshot, custom)
// ---------------------------------------------------------------------------

pub fn openai_tools() -> Value {
    Value::Array(
        tools::definitions()
            .into_iter()
            .map(|tool| {
                json!({
                    "type": "function",
                    "function": {
                        "name": tool.name,
                        "description": tool.description,
                        "parameters": tool.schema,
                    }
                })
            })
            .collect(),
    )
}

async fn openai_loop(
    context: &ToolContext,
    http: &reqwest::Client,
    request: ChatRequest,
    channel: Channel<ChatEvent>,
) -> Result<ChatReply, String> {
    let base_url = openai_base_url(&request)?;
    let mut messages: Vec<Value> = vec![json!({ "role": "system", "content": SYSTEM_PROMPT })];
    messages.extend(
        request
            .messages
            .iter()
            .map(|m| json!({ "role": m.role, "content": m.content })),
    );
    let mut tools_used = Vec::new();

    for _ in 0..=MAX_TOOL_ROUNDS {
        let response = http
            .post(format!("{base_url}/chat/completions"))
            .bearer_auth(request.api_key.trim())
            .json(&json!({
                "model": request.model,
                "tools": openai_tools(),
                "messages": messages,
            }))
            .send()
            .await
            .map_err(|e| format!("network error: {e}"))?;

        if !response.status().is_success() {
            return Err(provider_error_text(response).await);
        }
        let body: Value = response.json().await.map_err(|e| e.to_string())?;
        let message = body["choices"][0]["message"].clone();
        let tool_calls = message["tool_calls"]
            .as_array()
            .cloned()
            .unwrap_or_default();

        if tool_calls.is_empty() {
            let text = message["content"].as_str().unwrap_or("").to_owned();
            return Ok(ChatReply { text, tools_used });
        }

        messages.push(message.clone());
        for call in &tool_calls {
            let name = call["function"]["name"].as_str().unwrap_or("").to_owned();
            let args: Value = call["function"]["arguments"]
                .as_str()
                .and_then(|raw| serde_json::from_str(raw).ok())
                .unwrap_or_else(|| json!({}));
            emit(
                &channel,
                ChatEvent::ToolStart {
                    name: name.clone(),
                    summary: summarize_call(&name, &args),
                },
            );
            let outcome = tools::call(context, &name, args).await;
            emit(
                &channel,
                ChatEvent::ToolEnd {
                    name: name.clone(),
                    ok: outcome.is_ok(),
                },
            );
            tools_used.push(name);
            let text = match outcome {
                Ok(text) => text,
                Err(message) => format!("ERROR: {message}"),
            };
            messages.push(json!({
                "role": "tool",
                "tool_call_id": call["id"],
                "content": text,
            }));
        }
    }
    Err(
        "The agent hit the tool-call limit without finishing. Try a more specific question."
            .to_owned(),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tool_envelopes_match_provider_formats() {
        let anthropic = anthropic_tools();
        assert_eq!(anthropic[0]["name"], "search_flights");
        assert!(anthropic[0]["input_schema"]["properties"]["origin"].is_object());

        let openai = openai_tools();
        assert_eq!(openai[0]["type"], "function");
        assert_eq!(openai[0]["function"]["name"], "search_flights");
        assert!(openai[0]["function"]["parameters"]["properties"]["origin"].is_object());
    }

    #[test]
    fn base_urls_per_provider() {
        let req = |provider: &str, base: Option<&str>| ChatRequest {
            provider: provider.into(),
            model: "m".into(),
            api_key: "k".into(),
            base_url: base.map(Into::into),
            messages: vec![],
        };
        assert_eq!(
            openai_base_url(&req("grok", None)).unwrap(),
            "https://api.x.ai/v1"
        );
        assert_eq!(
            openai_base_url(&req("kimi", None)).unwrap(),
            "https://api.moonshot.ai/v1"
        );
        assert_eq!(
            openai_base_url(&req("custom", Some("http://localhost:11434/v1/"))).unwrap(),
            "http://localhost:11434/v1"
        );
        assert!(openai_base_url(&req("custom", None)).is_err());
    }
}
