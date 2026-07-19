//! Desktop-app bridge — the "use the AI you already pay for" path.
//!
//! Instead of an API key, Ask Marco can drive the AI desktop app you already
//! have open and signed in (Claude Desktop, ChatGPT): it types your question
//! in and reads the reply back, so you stay on your existing subscription with
//! no key to manage.
//!
//! macOS is implemented here through `osascript` (AppleScript UI scripting),
//! which needs the Accessibility permission. Windows (UI Automation) and Linux
//! (AT-SPI2) are not implemented yet and report `supported: false`.
//!
//! This is a chat-only bridge: the desktop apps won't call Marco's Rust travel
//! tools, so bridged answers don't run the live flight/hotel search. For that,
//! connect a local model or a cloud provider (which run the tool-calling agent
//! loop). Reading the reply back is best-effort — chat apps render into a deep,
//! app-specific accessibility tree, so when the scrape can't isolate the answer
//! the bridge still delivers the prompt and tells you to read it in the app.

use serde::Serialize;

use crate::ai::{ChatMessage, ChatReply};

/// A desktop AI app we know how to bridge to.
struct AppSpec {
    id: &'static str,
    label: &'static str,
    /// The name LaunchServices / AppleScript know the app by. Read only on
    /// macOS; the other platforms use `id`/`label` for display.
    #[cfg_attr(not(target_os = "macos"), allow(dead_code))]
    mac_app_name: &'static str,
}

const APPS: &[AppSpec] = &[
    AppSpec {
        id: "claude-desktop",
        label: "Claude Desktop",
        mac_app_name: "Claude",
    },
    AppSpec {
        id: "chatgpt-desktop",
        label: "ChatGPT",
        mac_app_name: "ChatGPT",
    },
];

/// A bridge target as reported to the UI. Mirrors `DesktopBridgeApp` in
/// `src/lib/tauri.ts`.
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DesktopApp {
    pub id: String,
    pub label: String,
    /// Whether a bridge backend for this app exists on the current OS.
    pub supported: bool,
    pub installed: bool,
    pub running: bool,
}

/// Bridge availability for the connect UI. Mirrors `BridgeStatus` in
/// `src/lib/tauri.ts`.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BridgeStatus {
    /// True when the bridge can run on this OS at all (macOS today).
    pub enabled: bool,
    /// `std::env::consts::OS`: "macos" | "windows" | "linux" | …
    pub os: String,
    /// macOS Accessibility permission — required to type into another app.
    pub accessibility_granted: bool,
    pub note: String,
    pub apps: Vec<DesktopApp>,
}

/// Newest user turn — the text we send to the desktop app.
fn last_user_message(messages: &[ChatMessage]) -> Option<&str> {
    messages
        .iter()
        .rev()
        .find(|m| m.role == "user")
        .map(|m| m.content.as_str())
}

pub async fn status() -> BridgeStatus {
    let os = std::env::consts::OS.to_owned();

    #[cfg(target_os = "macos")]
    {
        let accessibility_granted = macos::accessibility_trusted();
        let apps = tauri::async_runtime::spawn_blocking(|| {
            APPS.iter()
                .map(|app| DesktopApp {
                    id: app.id.to_owned(),
                    label: app.label.to_owned(),
                    supported: true,
                    installed: macos::is_installed(app.mac_app_name),
                    running: macos::is_running(app.mac_app_name),
                })
                .collect::<Vec<_>>()
        })
        .await
        .unwrap_or_default();

        let note = if accessibility_granted {
            "Types your question into the app and reads the reply back. Chat-only — \
bridged answers don't run live flight/hotel search."
                .to_owned()
        } else {
            "Grant Marco Polo the Accessibility permission so it can type into your AI app."
                .to_owned()
        };

        BridgeStatus {
            enabled: true,
            os,
            accessibility_granted,
            note,
            apps,
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        let apps = APPS
            .iter()
            .map(|app| DesktopApp {
                id: app.id.to_owned(),
                label: app.label.to_owned(),
                supported: false,
                installed: false,
                running: false,
            })
            .collect();
        BridgeStatus {
            enabled: false,
            os,
            accessibility_granted: false,
            note: "The desktop-app bridge is macOS-only for now.".to_owned(),
            apps,
        }
    }
}

/// Send the latest user turn to the chosen desktop app and read the reply.
pub async fn chat(app_id: &str, messages: &[ChatMessage]) -> Result<ChatReply, String> {
    let prompt = last_user_message(messages)
        .ok_or("Nothing to send.")?
        .to_owned();

    #[cfg(target_os = "macos")]
    {
        let app = APPS
            .iter()
            .find(|a| a.id == app_id)
            .ok_or_else(|| format!("unknown app: {app_id}"))?;
        if !macos::is_installed(app.mac_app_name) {
            return Err(format!("{} isn't installed on this Mac.", app.label));
        }
        if !macos::accessibility_trusted() {
            return Err(
                "Marco Polo needs the Accessibility permission (System Settings → \
Privacy & Security → Accessibility) to type into your AI app. Grant it, then try again."
                    .to_owned(),
            );
        }
        let name = app.mac_app_name.to_owned();
        let text =
            tauri::async_runtime::spawn_blocking(move || macos::send_and_read(&name, &prompt))
                .await
                .map_err(|e| e.to_string())??;
        Ok(ChatReply {
            text,
            tools_used: Vec::new(),
        })
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = (app_id, prompt);
        Err("The desktop-app bridge is macOS-only for now.".to_owned())
    }
}

/// Open the macOS Accessibility settings pane so the user can grant the
/// permission. No-op error off macOS.
pub fn open_accessibility_settings() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")
            .status()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(not(target_os = "macos"))]
    {
        Err("macOS only.".to_owned())
    }
}

// ---------------------------------------------------------------------------
// macOS backend
// ---------------------------------------------------------------------------

#[cfg(target_os = "macos")]
mod macos {
    use std::io::Write;
    use std::process::{Command, Stdio};
    use std::time::Duration;

    // AXIsProcessTrusted() reports whether this process holds the Accessibility
    // permission. It does not prompt (the *WithOptions variant does).
    #[link(name = "ApplicationServices", kind = "framework")]
    extern "C" {
        fn AXIsProcessTrusted() -> u8;
    }

    pub fn accessibility_trusted() -> bool {
        // Safety: a plain C predicate with no arguments and no pointers.
        unsafe { AXIsProcessTrusted() != 0 }
    }

    fn run_osascript(script: &str) -> Result<String, String> {
        let output = Command::new("osascript")
            .arg("-e")
            .arg(script)
            .output()
            .map_err(|e| e.to_string())?;
        if output.status.success() {
            Ok(String::from_utf8_lossy(&output.stdout).trim().to_owned())
        } else {
            Err(String::from_utf8_lossy(&output.stderr).trim().to_owned())
        }
    }

    /// `id of app "…"` resolves through LaunchServices without launching it, so
    /// success means the app is installed. Needs no special permission.
    pub fn is_installed(app_name: &str) -> bool {
        run_osascript(&format!("id of app \"{app_name}\"")).is_ok()
    }

    /// `is running` queries LaunchServices without launching the app or
    /// tripping the Automation prompt.
    pub fn is_running(app_name: &str) -> bool {
        run_osascript(&format!("application \"{app_name}\" is running"))
            .map(|s| s == "true")
            .unwrap_or(false)
    }

    fn set_clipboard(text: &str) -> Result<(), String> {
        let mut child = Command::new("pbcopy")
            .stdin(Stdio::piped())
            .spawn()
            .map_err(|e| e.to_string())?;
        child
            .stdin
            .take()
            .ok_or("pbcopy: no stdin")?
            .write_all(text.as_bytes())
            .map_err(|e| e.to_string())?;
        child.wait().map_err(|e| e.to_string())?;
        Ok(())
    }

    fn get_clipboard() -> String {
        Command::new("pbpaste")
            .output()
            .ok()
            .map(|o| String::from_utf8_lossy(&o.stdout).into_owned())
            .unwrap_or_default()
    }

    /// Paste the prompt into the frontmost chat and submit (Return). The prompt
    /// rides the clipboard rather than `keystroke`, so newlines and Unicode
    /// survive; the caller saves and restores the user's clipboard.
    fn send_prompt(app_name: &str, prompt: &str) -> Result<(), String> {
        set_clipboard(prompt)?;
        let script = format!(
            "tell application \"{app_name}\" to activate\n\
             delay 0.6\n\
             tell application \"System Events\"\n\
             keystroke \"v\" using command down\n\
             delay 0.25\n\
             key code 36\n\
             end tell"
        );
        run_osascript(&script).map(|_| ())
    }

    /// Best-effort scrape of the app's visible text via the accessibility tree,
    /// depth-bounded so a deep Electron web area can't run away.
    fn harvest(app_name: &str) -> String {
        let script = format!(
            "on collectText(el, depth)\n\
             set acc to \"\"\n\
             if depth > 8 then return acc\n\
             try\n\
             if (role of el) is \"AXStaticText\" then\n\
             set v to value of el\n\
             if v is not missing value then set acc to acc & v & linefeed\n\
             end if\n\
             end try\n\
             try\n\
             repeat with k in (UI elements of el)\n\
             set acc to acc & my collectText(k, depth + 1)\n\
             end repeat\n\
             end try\n\
             return acc\n\
             end collectText\n\
             tell application \"System Events\" to tell process \"{app_name}\"\n\
             set out to \"\"\n\
             try\n\
             set out to my collectText(front window, 0)\n\
             end try\n\
             end tell\n\
             return out"
        );
        run_osascript(&script).unwrap_or_default()
    }

    /// Pull the assistant's answer out of a transcript scrape: prefer the text
    /// that follows the echoed prompt; fall back to what's new since the
    /// pre-send baseline.
    fn extract_reply(before: &str, now: &str, prompt: &str) -> String {
        let key = prompt.lines().next().unwrap_or(prompt).trim();
        if !key.is_empty() {
            if let Some(pos) = now.rfind(key) {
                let tail = now[pos + key.len()..].trim();
                if !tail.is_empty() {
                    return tail.to_owned();
                }
            }
        }
        if let Some(rest) = now.strip_prefix(before) {
            return rest.trim().to_owned();
        }
        now.trim().to_owned()
    }

    pub fn send_and_read(app_name: &str, prompt: &str) -> Result<String, String> {
        let saved = get_clipboard();
        let before = harvest(app_name);
        let result = (|| {
            send_prompt(app_name, prompt)?;
            // Poll until the transcript stops growing (answer complete) or we
            // give up (~24s).
            let mut previous = String::new();
            let mut stable_rounds = 0;
            let mut reply = String::new();
            for _ in 0..18 {
                std::thread::sleep(Duration::from_millis(1300));
                let now = harvest(app_name);
                reply = extract_reply(&before, &now, prompt);
                if now == previous && !reply.trim().is_empty() {
                    stable_rounds += 1;
                    if stable_rounds >= 2 {
                        break;
                    }
                } else {
                    stable_rounds = 0;
                }
                previous = now;
            }
            Ok::<String, String>(reply)
        })();
        // Always restore the user's clipboard, even on error.
        let _ = set_clipboard(&saved);

        let reply = result?;
        let reply = reply.trim();
        if reply.is_empty() {
            return Err(format!(
                "Sent your question to {app_name}. It's answering there — reading the \
reply back automatically isn't reliable for this app yet, so check {app_name}."
            ));
        }
        // Keep the bubble sane if the scrape grabbed extra transcript.
        Ok(truncate(reply, 6000))
    }

    fn truncate(text: &str, max: usize) -> String {
        if text.len() <= max {
            return text.to_owned();
        }
        let mut end = max;
        while !text.is_char_boundary(end) {
            end -= 1;
        }
        format!("{}…", &text[..end])
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn picks_the_latest_user_message() {
        let msgs = vec![
            ChatMessage {
                role: "user".into(),
                content: "first".into(),
            },
            ChatMessage {
                role: "assistant".into(),
                content: "reply".into(),
            },
            ChatMessage {
                role: "user".into(),
                content: "second".into(),
            },
        ];
        assert_eq!(last_user_message(&msgs), Some("second"));
        assert_eq!(last_user_message(&[]), None);
    }

    #[tokio::test]
    async fn status_lists_the_known_apps() {
        let status = status().await;
        assert_eq!(status.apps.len(), 2);
        assert_eq!(status.os, std::env::consts::OS);
        assert!(status.apps.iter().any(|a| a.id == "claude-desktop"));
    }
}
