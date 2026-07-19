//! CLI-agent connector — the "use the subscription you already pay for" path.
//!
//! Run Ask Marco through an AI CLI you're already signed into (Claude Code,
//! Codex, Gemini CLI), instead of pasting an API key. This mirrors Orca's
//! Settings → Agents: pick an installed agent and it runs on your existing
//! subscription.
//!
//! GUI apps launch with a minimal PATH, so we resolve each CLI through the
//! user's login shell, then spawn it *directly* (absolute path) with the prompt
//! as a discrete argument — never a shell string — so nothing in the prompt is
//! interpreted. Reader threads drain stdout/stderr so a large reply can't
//! deadlock the pipe, and a timeout stops a hung agent.
//!
//! Chat-only for now: the CLI answers the travel question but doesn't call
//! Marco's Rust travel tools. (A future version can point these agents at
//! Marco's local MCP server so they can search flights/hotels directly.)

use std::io::Read;
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

use serde::Serialize;

use crate::ai::{ChatMessage, ChatReply};

const RUN_TIMEOUT: Duration = Duration::from_secs(180);

struct AgentSpec {
    id: &'static str,
    label: &'static str,
    /// Executable name resolved on the login-shell PATH.
    bin: &'static str,
    /// Fixed arguments before the prompt (the prompt is the final argument).
    args: &'static [&'static str],
}

// Flag verification (2026-07, against current CLI --help):
// - claude: `-p` / `--print` → non-interactive output; prompt is a positional.
// - codex:  `exec` (alias `e`) → non-interactive; prompt is a positional after
//   `exec`. `--skip-git-repo-check` lets us run from the desktop app cwd;
//   `--color never` keeps stdout clean for the chat UI.
// - gemini: `-p` / `--prompt <string>` → headless non-interactive mode.
const AGENTS: &[AgentSpec] = &[
    AgentSpec {
        id: "claude-code",
        label: "Claude Code",
        bin: "claude",
        args: &["-p"],
    },
    AgentSpec {
        id: "kimi-code",
        label: "Kimi Code",
        bin: "kimi",
        args: &["-p"],
    },
    AgentSpec {
        id: "codex",
        label: "Codex",
        bin: "codex",
        args: &["exec", "--skip-git-repo-check", "--color", "never"],
    },
    AgentSpec {
        id: "gemini-cli",
        label: "Gemini CLI",
        bin: "gemini",
        args: &["-p"],
    },
];

/// A CLI agent as reported to the UI. Mirrors `CliAgent` in `src/lib/tauri.ts`.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CliAgent {
    pub id: String,
    pub label: String,
    pub bin: String,
    pub installed: bool,
    /// Absolute path resolved via the login shell (empty when not found).
    pub path: String,
}

fn login_shell() -> String {
    std::env::var("SHELL").unwrap_or_else(|_| "/bin/sh".to_owned())
}

/// The PATH as seen by an interactive login shell (where users install CLIs).
fn shell_path() -> Option<String> {
    let output = Command::new(login_shell())
        .args(["-lc", "printf %s \"$PATH\""])
        .output()
        .ok()?;
    let path = String::from_utf8_lossy(&output.stdout).trim().to_owned();
    (!path.is_empty()).then_some(path)
}

/// Resolve a binary to an absolute path via the login shell, or `None`.
fn resolve(bin: &str) -> Option<String> {
    // `bin` is always a hardcoded name from AGENTS — never user input.
    let output = Command::new(login_shell())
        .arg("-lc")
        .arg(format!("command -v {bin}"))
        .output()
        .ok()?;
    if output.status.success() {
        let path = String::from_utf8_lossy(&output.stdout).trim().to_owned();
        if !path.is_empty() {
            return Some(path);
        }
    }

    // GUI apps (especially Tauri bundles) may see a stripped PATH. Fall back
    // to the usual macOS user-install locations.
    let home = dirs::home_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default();
    let candidates = [
        format!("{home}/.local/bin/{bin}"),
        format!("{home}/bin/{bin}"),
        format!("/usr/local/bin/{bin}"),
        format!("/opt/homebrew/bin/{bin}"),
    ];
    candidates
        .into_iter()
        .find(|candidate| std::path::Path::new(candidate).exists())
}

pub async fn detect() -> Vec<CliAgent> {
    tauri::async_runtime::spawn_blocking(|| {
        AGENTS
            .iter()
            .map(|agent| {
                let path = resolve(agent.bin);
                CliAgent {
                    id: agent.id.to_owned(),
                    label: agent.label.to_owned(),
                    bin: agent.bin.to_owned(),
                    installed: path.is_some(),
                    path: path.unwrap_or_default(),
                }
            })
            .collect()
    })
    .await
    .unwrap_or_default()
}

pub async fn chat(agent_id: &str, messages: &[ChatMessage]) -> Result<ChatReply, String> {
    let prompt = messages
        .iter()
        .rev()
        .find(|m| m.role == "user")
        .map(|m| m.content.clone())
        .ok_or("Nothing to send.")?;
    let agent = AGENTS
        .iter()
        .find(|a| a.id == agent_id)
        .ok_or_else(|| format!("unknown agent: {agent_id}"))?;
    let bin = agent.bin;
    let label = agent.label;
    let pre_args: Vec<String> = agent.args.iter().map(|s| (*s).to_owned()).collect();

    let text =
        tauri::async_runtime::spawn_blocking(move || run_cli(bin, label, &pre_args, &prompt))
            .await
            .map_err(|e| e.to_string())??;

    Ok(ChatReply {
        text,
        tools_used: Vec::new(),
    })
}

fn run_cli(bin: &str, label: &str, pre_args: &[String], prompt: &str) -> Result<String, String> {
    let path = resolve(bin).ok_or_else(|| {
        format!("{label} ({bin}) isn't on your PATH. Install it and sign in, then rescan.")
    })?;

    let mut command = Command::new(&path);
    command
        .args(pre_args)
        .arg(prompt)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    if let Some(path_env) = shell_path() {
        // Give the child the login-shell PATH so it can find its own runtime.
        command.env("PATH", path_env);
    }

    let mut child = command
        .spawn()
        .map_err(|e| format!("couldn't launch {label}: {e}"))?;

    // Drain the pipes on threads so a large reply can't deadlock us.
    let mut out_pipe = child.stdout.take();
    let mut err_pipe = child.stderr.take();
    let out_handle = std::thread::spawn(move || {
        let mut buf = String::new();
        if let Some(pipe) = out_pipe.as_mut() {
            let _ = pipe.read_to_string(&mut buf);
        }
        buf
    });
    let err_handle = std::thread::spawn(move || {
        let mut buf = String::new();
        if let Some(pipe) = err_pipe.as_mut() {
            let _ = pipe.read_to_string(&mut buf);
        }
        buf
    });

    let start = Instant::now();
    let status = loop {
        match child.try_wait().map_err(|e| e.to_string())? {
            Some(status) => break status,
            None => {
                if start.elapsed() > RUN_TIMEOUT {
                    let _ = child.kill();
                    return Err(format!(
                        "{label} took too long (over 3 min) and was stopped."
                    ));
                }
                std::thread::sleep(Duration::from_millis(200));
            }
        }
    };

    let stdout = out_handle.join().unwrap_or_default();
    let stderr = err_handle.join().unwrap_or_default();

    if status.success() {
        let text = stdout.trim();
        if text.is_empty() {
            return Err(format!("{label} returned an empty reply."));
        }
        Ok(text.to_owned())
    } else {
        let detail = stderr.trim();
        let hint = if detail.is_empty() {
            "it may need you to sign in first (e.g. `claude`, then /login)".to_owned()
        } else {
            detail.to_owned()
        };
        Err(format!("{label} error: {hint}"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn agents_have_stable_ids() {
        let ids: Vec<&str> = AGENTS.iter().map(|a| a.id).collect();
        assert_eq!(ids, vec!["claude-code", "kimi-code", "codex", "gemini-cli"]);
    }

    #[test]
    fn nonexistent_binary_does_not_resolve() {
        assert!(resolve("definitely-not-a-real-cli-xyz").is_none());
    }
}
