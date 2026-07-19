use std::process::Stdio;

use tauri::ipc::Channel;

#[derive(serde::Serialize, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ShellEvent {
    Stdout { line: String },
    Stderr { line: String },
    Done { code: i32 },
    Error { message: String },
}

fn is_valid_arg(arg: &str) -> bool {
    // Allow alphanumerics, dots, dashes, underscores, slashes, colons, equals, @
    // Disallow shell metacharacters.
    if arg.is_empty() {
        return false;
    }
    let forbidden = [
        '|', '&', ';', '$', '`', '(', ')', '<', '>', '\\', '{', '}', '[', ']', '*', '?', '~', '#',
        '!',
    ];
    !arg.contains(forbidden)
        && arg
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || " .-_/:=@".contains(c))
}

fn allowed_program(program: &str) -> bool {
    matches!(
        program,
        "ollama"
            | "claude"
            | "which"
            | "brew"
            | "curl"
            | "docker"
            | "docker-compose"
            | "npm"
            | "pnpm"
            | "node"
    )
}

fn resolve_shell() -> (String, Vec<String>) {
    if cfg!(target_os = "windows") {
        ("cmd".to_string(), vec!["/C".to_string()])
    } else {
        ("sh".to_string(), vec!["-c".to_string()])
    }
}

/// Run a shell command from a restricted whitelist and stream its output back.
/// This is intentionally limited: only known safe programs, no shell metacharacters.
#[tauri::command]
pub async fn run_shell_command(
    command: String,
    on_event: Channel<ShellEvent>,
) -> Result<(), String> {
    // Parse the command string into program and arguments.
    let parts: Vec<&str> = command.split_whitespace().collect();
    if parts.is_empty() {
        return Err("empty command".to_string());
    }

    let program = parts[0];
    if !allowed_program(program) {
        return Err(format!("program '{}' is not in the allowed list", program));
    }

    for arg in &parts[1..] {
        if !is_valid_arg(arg) {
            return Err(format!("argument '{}' contains forbidden characters", arg));
        }
    }

    let (shell, shell_flag) = resolve_shell();
    let script = parts.join(" ");

    let mut child = tokio::process::Command::new(&shell)
        .args(&shell_flag)
        .arg(&script)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("failed to spawn command: {}", e))?;

    let stdout = child.stdout.take().ok_or("missing stdout")?;
    let stderr = child.stderr.take().ok_or("missing stderr")?;

    let stdout_reader = tokio::io::BufReader::new(stdout);
    let stderr_reader = tokio::io::BufReader::new(stderr);

    let on_event_stdout = on_event.clone();
    let stdout_task = tauri::async_runtime::spawn(async move {
        use tokio::io::AsyncBufReadExt;
        let mut lines = stdout_reader.lines();
        while let Ok(Some(line)) = lines.next_line().await {
            let _ = on_event_stdout.send(ShellEvent::Stdout { line });
        }
    });

    let on_event_stderr = on_event.clone();
    let stderr_task = tauri::async_runtime::spawn(async move {
        use tokio::io::AsyncBufReadExt;
        let mut lines = stderr_reader.lines();
        while let Ok(Some(line)) = lines.next_line().await {
            let _ = on_event_stderr.send(ShellEvent::Stderr { line });
        }
    });

    let _ = stdout_task.await;
    let _ = stderr_task.await;

    let status = child
        .wait()
        .await
        .map_err(|e| format!("failed to wait for command: {}", e))?;

    let _ = on_event.send(ShellEvent::Done {
        code: status.code().unwrap_or(-1),
    });

    Ok(())
}

/// Quick non-streaming check: does a program exist on PATH?
#[tauri::command]
pub async fn shell_which(program: String) -> Result<bool, String> {
    if !is_valid_arg(&program) || !allowed_program(&program) {
        return Ok(false);
    }
    let (shell, shell_flag) = resolve_shell();
    let output = tokio::process::Command::new(&shell)
        .args(&shell_flag)
        .arg(format!("which {}", program))
        .output()
        .await
        .map_err(|e| e.to_string())?;
    Ok(output.status.success())
}
