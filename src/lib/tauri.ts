/**
 * Typed bridge to the Tauri (Rust) backend.
 *
 * When the app runs in a plain browser (`pnpm dev` without Tauri), commands
 * fall back to small static samples so the UI stays developable — the real
 * providers are only reachable through the Rust side.
 */
import { invoke } from "@tauri-apps/api/core";

import type {
  FlightSearchQuery,
  FlightSearchResult,
  HotelSearchQuery,
  HotelSearchResult,
  LocationSuggestion,
} from "./types";
import {
  webFallbackCliAgents,
  webFallbackFlights,
  webFallbackHotels,
  webFallbackLocalRuntimes,
  webFallbackLocations,
} from "./web-fallback";

export interface BackendStatus {
  flightsProvider: string;
  flightsConfigured: boolean;
  /** "test" | "live" | "demo" (or "browser" in the web preview) */
  environment: string;
  hotelsProvider: string;
  hotelsConfigured: boolean;
  /** "live" | "sandbox" | "demo" */
  hotelsEnvironment: string;
  /** Local MCP endpoint external AI clients can connect to. */
  mcpEndpoint: string;
  version: string;
}

export interface BackendError {
  code: "network" | "provider" | "decode" | "invalid_input" | string;
  message: string;
}

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function toBackendError(err: unknown): BackendError {
  if (
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof (err as BackendError).message === "string"
  ) {
    return err as BackendError;
  }
  return { code: "unknown", message: String(err) };
}

export async function searchFlights(
  query: FlightSearchQuery,
): Promise<FlightSearchResult> {
  if (!isTauri()) {
    return webFallbackFlights(query);
  }
  return invoke<FlightSearchResult>("search_flights", { query });
}

export async function searchLocations(
  keyword: string,
): Promise<LocationSuggestion[]> {
  if (!isTauri()) {
    return webFallbackLocations(keyword);
  }
  return invoke<LocationSuggestion[]>("search_locations", { keyword });
}

export async function searchHotels(
  query: HotelSearchQuery,
): Promise<HotelSearchResult> {
  if (!isTauri()) {
    return webFallbackHotels(query);
  }
  return invoke<HotelSearchResult>("search_hotels", { query });
}

export async function backendStatus(): Promise<BackendStatus> {
  if (!isTauri()) {
    return {
      flightsProvider: "duffel",
      flightsConfigured: false,
      environment: "browser",
      hotelsProvider: "liteapi",
      hotelsConfigured: false,
      hotelsEnvironment: "browser",
      mcpEndpoint: "http://127.0.0.1:1254/mcp",
      version: "web-preview",
    };
  }
  return invoke<BackendStatus>("backend_status");
}

// ---------------------------------------------------------------------------
// Ask Marco chat (desktop-only: the agent loop runs in Rust)
// ---------------------------------------------------------------------------

export type AiProvider =
  | "anthropic"
  | "openai"
  | "grok"
  | "kimi"
  | "custom"
  | "local"
  | "cli"
  | "bridge";

export interface AiChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiChatRequest {
  provider: AiProvider;
  model: string;
  apiKey: string;
  baseUrl?: string;
  messages: AiChatMessage[];
}

export type AiChatEvent =
  | { type: "toolStart"; name: string; summary: string }
  | { type: "toolEnd"; name: string; ok: boolean }
  /** Incremental assistant text from a streaming cloud provider. */
  | { type: "textDelta"; text: string };

export interface AiChatReply {
  text: string;
  toolsUsed: string[];
}

export async function aiChat(
  request: AiChatRequest,
  onEvent: (event: AiChatEvent) => void,
): Promise<AiChatReply> {
  if (!isTauri()) {
    throw {
      code: "web_preview",
      message:
        "Ask Marco runs the agent inside the desktop app — open Marco Polo (not the browser preview) to chat.",
    } satisfies BackendError;
  }
  const { Channel } = await import("@tauri-apps/api/core");
  const channel = new Channel<AiChatEvent>();
  channel.onmessage = onEvent;
  return invoke<AiChatReply>("ai_chat", { request, onEvent: channel });
}

// ---------------------------------------------------------------------------
// No-API-key connectors: local model servers + (scaffold) desktop-app bridge.
// Mirrors `LocalRuntime` / `BridgeStatus` in src-tauri/src/ai_local.rs &
// ai_bridge.rs.
// ---------------------------------------------------------------------------

/** A local model server discovered on this machine (needs no API key). */
export interface LocalRuntime {
  id: string;
  label: string;
  /** OpenAI-compatible base, e.g. http://localhost:11434/v1 */
  baseUrl: string;
  running: boolean;
  models: string[];
  setupHint: string;
}

/** Probe the machine for local model servers (Ollama, LM Studio, Jan, …). */
export async function aiLocalDetect(): Promise<LocalRuntime[]> {
  if (!isTauri()) {
    return webFallbackLocalRuntimes();
  }
  return invoke<LocalRuntime[]>("ai_local_detect");
}

/** An AI CLI you're signed into (Claude Code, Codex, Gemini) — no API key. */
export interface CliAgent {
  id: string;
  label: string;
  bin: string;
  installed: boolean;
  /** Absolute path resolved via the login shell (empty when not found). */
  path: string;
}

/** Detect installed AI CLIs the user can run on their existing subscription. */
export async function aiCliDetect(): Promise<CliAgent[]> {
  if (!isTauri()) {
    return webFallbackCliAgents();
  }
  return invoke<CliAgent[]>("ai_cli_detect");
}

/** A desktop AI app the bridge can drive (Claude Desktop, ChatGPT). */
export interface DesktopBridgeApp {
  id: string;
  label: string;
  /** A bridge backend exists for this app on the current OS. */
  supported: boolean;
  installed: boolean;
  running: boolean;
}

export interface BridgeStatus {
  /** The bridge can run on this OS at all (macOS today). */
  enabled: boolean;
  /** "macos" | "windows" | "linux" | … */
  os: string;
  /** macOS Accessibility permission — required to type into another app. */
  accessibilityGranted: boolean;
  note: string;
  apps: DesktopBridgeApp[];
}

const BRIDGE_PREVIEW: BridgeStatus = {
  enabled: false,
  os: "browser",
  accessibilityGranted: false,
  note: "The desktop-app bridge runs inside the Marco Polo desktop app (macOS). Open the app to use it.",
  apps: [
    { id: "claude-desktop", label: "Claude Desktop", supported: false, installed: false, running: false },
    { id: "chatgpt-desktop", label: "ChatGPT", supported: false, installed: false, running: false },
  ],
};

/** Availability of the desktop-app bridge (installed apps, Accessibility). */
export async function aiBridgeStatus(): Promise<BridgeStatus> {
  if (!isTauri()) {
    return BRIDGE_PREVIEW;
  }
  return invoke<BridgeStatus>("ai_bridge_status");
}

/** Open the macOS Accessibility settings pane to grant permission. */
export async function aiBridgeOpenSettings(): Promise<void> {
  if (!isTauri()) return;
  await invoke("ai_bridge_open_settings");
}

// ---------------------------------------------------------------------------
// Shell command runner (desktop only)
// ---------------------------------------------------------------------------

export type ShellEvent =
  | { type: "stdout"; line: string }
  | { type: "stderr"; line: string }
  | { type: "done"; code: number }
  | { type: "error"; message: string };

export async function runShellCommand(
  command: string,
  onEvent: (event: ShellEvent) => void,
): Promise<void> {
  if (!isTauri()) {
    onEvent({ type: "error", message: "Shell commands only run inside the Marco Polo desktop app." });
    return;
  }
  const { Channel } = await import("@tauri-apps/api/core");
  const channel = new Channel<ShellEvent>();
  channel.onmessage = onEvent;
  await invoke("run_shell_command", { command, onEvent: channel });
}

export async function shellWhich(program: string): Promise<boolean> {
  if (!isTauri()) return false;
  return invoke<boolean>("shell_which", { program });
}
