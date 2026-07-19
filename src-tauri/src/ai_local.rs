//! Local AI connectors — the no-API-key path for Ask Marco.
//!
//! Ollama, LM Studio, Jan, and llama.cpp's bundled server all speak the OpenAI
//! `/v1/chat/completions` protocol and advertise their loaded models at
//! `/v1/models`, so a single probe covers every one of them. We just discover
//! which of the well-known local endpoints is up and which models it serves;
//! the actual agent loop reuses `ai::openai_loop` with the discovered base URL
//! and an empty key (local servers ignore `Authorization`).

use std::time::Duration;

use serde::Serialize;
use serde_json::Value;

/// A well-known local model server we know how to talk to.
struct Candidate {
    id: &'static str,
    label: &'static str,
    /// OpenAI-compatible base, e.g. `http://localhost:11434/v1`.
    base_url: &'static str,
    /// One-line hint shown in the UI when the server isn't running.
    setup_hint: &'static str,
}

const CANDIDATES: &[Candidate] = &[
    Candidate {
        id: "ollama",
        label: "Ollama",
        base_url: "http://localhost:11434/v1",
        setup_hint: "Install from ollama.com, then: ollama pull llama3.1",
    },
    Candidate {
        id: "lmstudio",
        label: "LM Studio",
        base_url: "http://localhost:1234/v1",
        setup_hint: "LM Studio → Developer → Start Server",
    },
    Candidate {
        id: "jan",
        label: "Jan",
        base_url: "http://localhost:1337/v1",
        setup_hint: "Jan → Settings → Local API Server → Start Server",
    },
    Candidate {
        id: "llamacpp",
        label: "llama.cpp",
        base_url: "http://localhost:8080/v1",
        setup_hint: "llama-server -m your-model.gguf",
    },
];

/// A local runtime as reported to the UI. Serializes camelCase to mirror
/// `LocalRuntime` in `src/lib/tauri.ts`.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalRuntime {
    pub id: String,
    pub label: String,
    pub base_url: String,
    /// True when the server answered our probe.
    pub running: bool,
    /// Model ids the server is currently serving (may be empty if none pulled).
    pub models: Vec<String>,
    pub setup_hint: String,
}

/// Probe every known local endpoint and report what's running. Sequential with
/// a tight timeout so a machine with nothing installed still returns quickly.
pub async fn detect() -> Vec<LocalRuntime> {
    let http = reqwest::Client::builder()
        .timeout(Duration::from_millis(600))
        .build()
        .unwrap_or_default();

    let mut runtimes = Vec::with_capacity(CANDIDATES.len());
    for candidate in CANDIDATES {
        let models = probe_models(&http, candidate.base_url).await;
        runtimes.push(LocalRuntime {
            id: candidate.id.to_owned(),
            label: candidate.label.to_owned(),
            base_url: candidate.base_url.to_owned(),
            running: models.is_some(),
            models: models.unwrap_or_default(),
            setup_hint: candidate.setup_hint.to_owned(),
        });
    }
    runtimes
}

/// `Some(models)` when the server responded (an empty list means it's up but no
/// model is loaded); `None` when unreachable or erroring.
async fn probe_models(http: &reqwest::Client, base_url: &str) -> Option<Vec<String>> {
    let url = format!("{}/models", base_url.trim_end_matches('/'));
    let response = http.get(&url).send().await.ok()?;
    if !response.status().is_success() {
        return None;
    }
    let body: Value = response.json().await.ok()?;
    Some(parse_models(&body))
}

/// Pull sorted, de-duplicated model ids out of an OpenAI `/v1/models` body:
/// `{ "data": [ { "id": "llama3.1:8b" }, … ] }`.
fn parse_models(body: &Value) -> Vec<String> {
    let mut models: Vec<String> = body["data"]
        .as_array()
        .map(|entries| {
            entries
                .iter()
                .filter_map(|entry| entry["id"].as_str().map(str::to_owned))
                .collect()
        })
        .unwrap_or_default();
    models.sort();
    models.dedup();
    models
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn extracts_sorted_unique_model_ids() {
        let body = json!({
            "object": "list",
            "data": [
                { "id": "qwen2.5:14b", "object": "model" },
                { "id": "llama3.1:8b", "object": "model" },
                { "id": "llama3.1:8b", "object": "model" },
            ],
        });
        assert_eq!(parse_models(&body), vec!["llama3.1:8b", "qwen2.5:14b"]);
    }

    #[test]
    fn missing_data_yields_no_models() {
        assert!(parse_models(&json!({})).is_empty());
        assert!(parse_models(&json!({ "data": null })).is_empty());
    }
}
