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
    /// "anthropic" | "openai" | "grok" | "kimi" | "custom" | "local" | "bridge"
    pub provider: String,
    pub model: String,
    /// Empty for keyless connectors ("local", and "custom" pointed at a local
    /// server). Required for the cloud providers.
    pub api_key: String,
    /// Base URL for "custom" and "local" (OpenAI-compatible) providers.
    pub base_url: Option<String>,
    pub messages: Vec<ChatMessage>,
}

/// Cloud providers that require a user-supplied API key. Everything else
/// ("local", "custom", "bridge") is keyless.
fn needs_api_key(provider: &str) -> bool {
    matches!(provider, "anthropic" | "openai" | "grok" | "kimi")
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
    ToolStart {
        name: String,
        summary: String,
    },
    ToolEnd {
        name: String,
        ok: bool,
    },
    /// Incremental assistant text (cloud providers stream token-by-token).
    TextDelta {
        text: String,
    },
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
    if needs_api_key(&request.provider) && request.api_key.trim().is_empty() {
        return Err("No API key set. Connect a model first.".to_owned());
    }
    // The desktop-app bridge drives an installed AI app instead of an API; it
    // has its own (non-HTTP) path. `request.model` carries the app id.
    if request.provider == "bridge" {
        return crate::ai_bridge::chat(&request.model, &request.messages).await;
    }
    // The CLI-agent connector shells out to an installed AI CLI (Claude Code,
    // Codex, Gemini) on the user's subscription. `request.model` carries the
    // agent id.
    if request.provider == "cli" {
        return crate::ai_cli::chat(&request.model, &request.messages).await;
    }
    let http = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(180))
        .build()
        .map_err(|e| e.to_string())?;

    match request.provider.as_str() {
        "anthropic" => anthropic_loop(context, &http, request, channel).await,
        "openai" | "grok" | "kimi" | "custom" | "local" => {
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
        "custom" | "local" => request
            .base_url
            .clone()
            .filter(|u| !u.trim().is_empty())
            .ok_or("this provider needs a base URL")?,
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
// SSE helpers (Anthropic + OpenAI-compatible streaming)
// ---------------------------------------------------------------------------

/// Incremental Server-Sent Events parser. Feed raw bytes; get complete
/// `(event_name, data)` pairs. `event_name` is empty when the stream omits
/// the `event:` field (OpenAI-style).
struct SseReader {
    buffer: String,
    event_name: String,
    data_lines: Vec<String>,
}

impl SseReader {
    fn new() -> Self {
        Self {
            buffer: String::new(),
            event_name: String::new(),
            data_lines: Vec::new(),
        }
    }

    fn push(&mut self, chunk: &str) -> Vec<(String, String)> {
        self.buffer.push_str(chunk);
        let mut events = Vec::new();
        while let Some(idx) = self.buffer.find('\n') {
            let mut line = self.buffer[..idx].to_owned();
            self.buffer.drain(..=idx);
            if line.ends_with('\r') {
                line.pop();
            }
            if line.is_empty() {
                if !self.data_lines.is_empty() || !self.event_name.is_empty() {
                    events.push((
                        std::mem::take(&mut self.event_name),
                        self.data_lines.join("\n"),
                    ));
                    self.data_lines.clear();
                }
                continue;
            }
            if let Some(rest) = line.strip_prefix("event:") {
                self.event_name = rest.trim().to_owned();
            } else if let Some(rest) = line.strip_prefix("data:") {
                // Spec: optional single leading space after the colon.
                let data = rest.strip_prefix(' ').unwrap_or(rest);
                self.data_lines.push(data.to_owned());
            }
            // ignore id:/retry:/comments
        }
        events
    }
}

/// Drain an HTTP body as SSE, yielding `(event, data)` pairs.
async fn read_sse_events(mut response: reqwest::Response) -> Result<Vec<(String, String)>, String> {
    let mut reader = SseReader::new();
    let mut all = Vec::new();
    loop {
        let chunk = response
            .chunk()
            .await
            .map_err(|e| format!("stream error: {e}"))?;
        let Some(bytes) = chunk else { break };
        let text = String::from_utf8_lossy(&bytes);
        all.extend(reader.push(&text));
    }
    // Flush a trailing event that lacked a final blank line.
    if !reader.data_lines.is_empty() || !reader.event_name.is_empty() {
        all.push((
            std::mem::take(&mut reader.event_name),
            reader.data_lines.join("\n"),
        ));
    }
    Ok(all)
}

// ---------------------------------------------------------------------------
// Anthropic Messages API (streaming)
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

struct AnthropicRound {
    content: Vec<Value>,
    stop_reason: String,
    text: String,
}

/// Parse a full Anthropic SSE stream into content blocks + stop_reason,
/// emitting TextDelta events as text arrives.
async fn anthropic_stream_round(
    response: reqwest::Response,
    channel: &Channel<ChatEvent>,
) -> Result<AnthropicRound, String> {
    let events = read_sse_events(response).await?;
    let mut content: Vec<Value> = Vec::new();
    // Parallel buffer of partial JSON for tool_use input by block index.
    let mut tool_json: Vec<String> = Vec::new();
    let mut stop_reason = String::new();
    let mut text = String::new();

    for (event, data) in events {
        if data == "[DONE]" {
            break;
        }
        let Ok(payload) = serde_json::from_str::<Value>(&data) else {
            continue;
        };
        let kind = if event.is_empty() {
            payload["type"].as_str().unwrap_or("")
        } else {
            event.as_str()
        };

        match kind {
            "content_block_start" => {
                let index = payload["index"].as_u64().unwrap_or(0) as usize;
                let block = payload["content_block"].clone();
                while content.len() <= index {
                    content.push(Value::Null);
                    tool_json.push(String::new());
                }
                content[index] = block;
            }
            "content_block_delta" => {
                let index = payload["index"].as_u64().unwrap_or(0) as usize;
                let delta = &payload["delta"];
                let delta_type = delta["type"].as_str().unwrap_or("");
                if delta_type == "text_delta" {
                    if let Some(piece) = delta["text"].as_str() {
                        if !piece.is_empty() {
                            text.push_str(piece);
                            emit(
                                channel,
                                ChatEvent::TextDelta {
                                    text: piece.to_owned(),
                                },
                            );
                            if let Some(block) = content.get_mut(index) {
                                let existing = block["text"].as_str().unwrap_or("").to_owned();
                                block["text"] = Value::String(existing + piece);
                            }
                        }
                    }
                } else if delta_type == "input_json_delta" {
                    if let Some(piece) = delta["partial_json"].as_str() {
                        if let Some(buf) = tool_json.get_mut(index) {
                            buf.push_str(piece);
                        }
                    }
                }
            }
            "content_block_stop" => {
                let index = payload["index"].as_u64().unwrap_or(0) as usize;
                if let Some(block) = content.get_mut(index) {
                    if block["type"] == "tool_use" {
                        let raw = tool_json.get(index).map(String::as_str).unwrap_or("");
                        let input: Value = if raw.trim().is_empty() {
                            json!({})
                        } else {
                            serde_json::from_str(raw).unwrap_or_else(|_| json!({}))
                        };
                        block["input"] = input;
                    }
                }
            }
            "message_delta" => {
                if let Some(reason) = payload["delta"]["stop_reason"].as_str() {
                    stop_reason = reason.to_owned();
                }
            }
            "error" => {
                let msg = payload
                    .pointer("/error/message")
                    .and_then(|v| v.as_str())
                    .unwrap_or("stream error");
                return Err(format!("Model API stream error: {msg}"));
            }
            _ => {}
        }
    }

    // Drop any Null placeholders that never received a start event.
    content.retain(|b| !b.is_null());
    Ok(AnthropicRound {
        content,
        stop_reason,
        text,
    })
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
                "max_tokens": 16000,
                "stream": true,
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

        let round = anthropic_stream_round(response, &channel).await?;

        // Newer Claude models can decline a request (HTTP 200) with an empty
        // body — surface that instead of returning blank text.
        if round.stop_reason == "refusal" {
            return Ok(ChatReply {
                text: "The model declined this request (its safety classifier flagged it). Try rephrasing, or connect a different model.".to_owned(),
                tools_used,
            });
        }

        if round.stop_reason != "tool_use" {
            return Ok(ChatReply {
                text: round.text,
                tools_used,
            });
        }

        // Execute every tool_use block, then continue the conversation.
        let mut results = Vec::new();
        for block in &round.content {
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
        messages.push(json!({ "role": "assistant", "content": round.content }));
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

struct OpenAiRound {
    message: Value,
    text: String,
}

/// Parse an OpenAI-compatible SSE stream into a single assistant message,
/// emitting TextDelta events for content tokens.
async fn openai_stream_round(
    response: reqwest::Response,
    channel: &Channel<ChatEvent>,
) -> Result<OpenAiRound, String> {
    let events = read_sse_events(response).await?;
    let mut text = String::new();
    let mut refusal = String::new();
    // tool_calls accumulated by index
    let mut tool_calls: Vec<Value> = Vec::new();
    let mut role = "assistant".to_owned();

    for (_event, data) in events {
        let data = data.trim();
        if data.is_empty() || data == "[DONE]" {
            continue;
        }
        let Ok(payload) = serde_json::from_str::<Value>(data) else {
            continue;
        };
        if let Some(err) = payload.get("error") {
            let msg = err
                .get("message")
                .and_then(|v| v.as_str())
                .unwrap_or("stream error");
            return Err(format!("Model API stream error: {msg}"));
        }
        let choice = &payload["choices"][0];
        let delta = &choice["delta"];
        if let Some(r) = delta["role"].as_str() {
            role = r.to_owned();
        }
        if let Some(piece) = delta["content"].as_str() {
            if !piece.is_empty() {
                text.push_str(piece);
                emit(
                    channel,
                    ChatEvent::TextDelta {
                        text: piece.to_owned(),
                    },
                );
            }
        }
        if let Some(r) = delta["refusal"].as_str() {
            refusal.push_str(r);
        }
        if let Some(calls) = delta["tool_calls"].as_array() {
            for call in calls {
                let index = call["index"].as_u64().unwrap_or(0) as usize;
                while tool_calls.len() <= index {
                    tool_calls.push(json!({
                        "id": "",
                        "type": "function",
                        "function": { "name": "", "arguments": "" }
                    }));
                }
                let slot = &mut tool_calls[index];
                if let Some(id) = call["id"].as_str() {
                    if !id.is_empty() {
                        slot["id"] = Value::String(id.to_owned());
                    }
                }
                if let Some(t) = call["type"].as_str() {
                    slot["type"] = Value::String(t.to_owned());
                }
                if let Some(name) = call["function"]["name"].as_str() {
                    if !name.is_empty() {
                        let existing = slot["function"]["name"].as_str().unwrap_or("").to_owned();
                        slot["function"]["name"] = Value::String(existing + name);
                    }
                }
                if let Some(args) = call["function"]["arguments"].as_str() {
                    let existing = slot["function"]["arguments"]
                        .as_str()
                        .unwrap_or("")
                        .to_owned();
                    slot["function"]["arguments"] = Value::String(existing + args);
                }
            }
        }
    }

    let mut message = json!({ "role": role });
    if !text.is_empty() {
        message["content"] = Value::String(text.clone());
    } else {
        message["content"] = Value::Null;
    }
    if !refusal.is_empty() {
        message["refusal"] = Value::String(refusal);
    }
    if !tool_calls.is_empty() {
        message["tool_calls"] = Value::Array(tool_calls);
    }

    Ok(OpenAiRound { message, text })
}

/// Cloud OpenAI-compatible providers stream; local/custom servers get a plain
/// JSON response (many local stacks mishandle or ignore `stream: true`).
fn openai_should_stream(provider: &str) -> bool {
    matches!(provider, "openai" | "grok" | "kimi")
}

async fn openai_loop(
    context: &ToolContext,
    http: &reqwest::Client,
    request: ChatRequest,
    channel: Channel<ChatEvent>,
) -> Result<ChatReply, String> {
    let base_url = openai_base_url(&request)?;
    let stream = openai_should_stream(&request.provider);
    let mut messages: Vec<Value> = vec![json!({ "role": "system", "content": SYSTEM_PROMPT })];
    messages.extend(
        request
            .messages
            .iter()
            .map(|m| json!({ "role": m.role, "content": m.content })),
    );
    let mut tools_used = Vec::new();

    for _ in 0..=MAX_TOOL_ROUNDS {
        let mut body = json!({
            "model": request.model,
            "tools": openai_tools(),
            "messages": messages,
        });
        if stream {
            body["stream"] = Value::Bool(true);
        }
        let mut builder = http
            .post(format!("{base_url}/chat/completions"))
            .json(&body);
        // Local servers (Ollama, LM Studio, …) ignore auth; only send a bearer
        // token when the user actually supplied one.
        let key = request.api_key.trim();
        if !key.is_empty() {
            builder = builder.bearer_auth(key);
        }
        let response = builder
            .send()
            .await
            .map_err(|e| format!("network error: {e}"))?;

        if !response.status().is_success() {
            return Err(provider_error_text(response).await);
        }

        let (message, text) = if stream {
            let round = openai_stream_round(response, &channel).await?;
            (round.message, round.text)
        } else {
            let body: Value = response.json().await.map_err(|e| e.to_string())?;
            let message = body["choices"][0]["message"].clone();
            let text = message["content"].as_str().unwrap_or("").to_owned();
            (message, text)
        };

        // OpenAI-compatible models report a hard refusal on `message.refusal`.
        if let Some(refusal) = message["refusal"].as_str() {
            if !refusal.trim().is_empty() {
                return Ok(ChatReply {
                    text: refusal.to_owned(),
                    tools_used,
                });
            }
        }

        let tool_calls = message["tool_calls"]
            .as_array()
            .cloned()
            .unwrap_or_default();

        if tool_calls.is_empty() {
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
            let tool_text = match outcome {
                Ok(text) => text,
                Err(message) => format!("ERROR: {message}"),
            };
            messages.push(json!({
                "role": "tool",
                "tool_call_id": call["id"],
                "content": tool_text,
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
        assert_eq!(
            openai_base_url(&req("local", Some("http://localhost:1234/v1"))).unwrap(),
            "http://localhost:1234/v1"
        );
        assert!(openai_base_url(&req("custom", None)).is_err());
        assert!(openai_base_url(&req("local", None)).is_err());
    }

    #[test]
    fn only_cloud_providers_require_a_key() {
        assert!(needs_api_key("anthropic"));
        assert!(needs_api_key("openai"));
        assert!(!needs_api_key("local"));
        assert!(!needs_api_key("custom"));
        assert!(!needs_api_key("bridge"));
    }

    #[test]
    fn only_cloud_openai_compat_streams() {
        assert!(openai_should_stream("openai"));
        assert!(openai_should_stream("grok"));
        assert!(openai_should_stream("kimi"));
        assert!(!openai_should_stream("local"));
        assert!(!openai_should_stream("custom"));
    }

    #[test]
    fn sse_reader_handles_split_chunks_and_named_events() {
        let mut reader = SseReader::new();
        // Anthropic-style named event, split across chunks mid-line.
        let mut events = reader.push("event: content_block_delta\ndata: {\"t");
        assert!(events.is_empty());
        events = reader.push("ext\":\"Hi\"}\n\n");
        assert_eq!(events.len(), 1);
        assert_eq!(events[0].0, "content_block_delta");
        assert_eq!(events[0].1, "{\"text\":\"Hi\"}");

        // OpenAI-style (no event: line) + [DONE]
        events = reader.push("data: {\"choices\":[]}\n\ndata: [DONE]\n\n");
        assert_eq!(events.len(), 2);
        assert_eq!(events[0].0, "");
        assert_eq!(events[0].1, "{\"choices\":[]}");
        assert_eq!(events[1].1, "[DONE]");
    }

    #[test]
    fn sse_reader_joins_multiline_data() {
        let mut reader = SseReader::new();
        let events = reader.push("data: line1\ndata: line2\n\n");
        assert_eq!(events.len(), 1);
        assert_eq!(events[0].1, "line1\nline2");
    }
}
