"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  BadgeCheck,
  Check,
  CircleCheck,
  CircleX,
  Cloud,
  Cpu,
  Loader2,
  MonitorSmartphone,
  PlugZap,
  RefreshCw,
  Send,
  Settings2,
  Wrench,
} from "lucide-react";

import { MarcoFace } from "@/components/chat/marco-face";
import { cn } from "@/lib/utils";
import {
  aiBridgeOpenSettings,
  aiBridgeStatus,
  aiChat,
  aiCliDetect,
  aiLocalDetect,
  toBackendError,
  type AiChatMessage,
  type AiProvider,
  type BridgeStatus,
  type CliAgent,
  type LocalRuntime,
} from "@/lib/tauri";

/** Cloud providers that need the user's own API key. */
const CLOUD_PROVIDERS: { id: AiProvider; label: string; defaultModel: string }[] = [
  { id: "anthropic", label: "Claude (Anthropic)", defaultModel: "claude-opus-4-8" },
  { id: "openai", label: "OpenAI", defaultModel: "gpt-5" },
  { id: "grok", label: "Grok (xAI)", defaultModel: "grok-4" },
  { id: "kimi", label: "Kimi (Moonshot)", defaultModel: "kimi-k2" },
  { id: "custom", label: "Custom (OpenAI-compatible)", defaultModel: "" },
];
const CLOUD_IDS = CLOUD_PROVIDERS.map((p) => p.id);

type ConnectTab = "your" | "cloud";
const CONNECT_TABS: { id: ConnectTab; label: string; Icon: typeof Cpu }[] = [
  { id: "your", label: "Your AI · no key", Icon: PlugZap },
  { id: "cloud", label: "API key", Icon: Cloud },
];

const STORAGE_KEY = "marcopolo.ai.config";

interface AiConfig {
  provider: AiProvider;
  model: string;
  apiKey: string;
  baseUrl: string;
  /** Display label for a local/CLI/bridge connection, e.g. "Ollama". */
  label?: string;
}

interface UiMessage {
  role: "user" | "assistant";
  content: string;
  tools?: string[];
  error?: boolean;
}

interface Activity {
  name: string;
  summary: string;
  done: boolean;
  ok: boolean;
}

const TOOL_LABELS: Record<string, string> = {
  search_flights: "Flights",
  search_hotels: "Hotels",
  search_experiences: "Experiences",
  search_locations: "Places",
};

const SUGGESTIONS = [
  "Plan 4 days in Kyoto & Osaka: flights from NYC, a central hotel, food experiences, budget for 2.",
  "Cheapest nonstop JFK → LHR on August 17?",
  "Weekend in Paris under €800 for two — the full plan.",
];

const inputClass =
  "w-full rounded-lg border border-border bg-card px-3.5 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20";

const cardClass =
  "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition active:scale-[0.99] disabled:opacity-50 disabled:active:scale-100";

/** True when `config` is ready to run the agent. */
function isConnected(config: AiConfig): boolean {
  if (config.model.trim().length === 0) return false;
  // CLI agent (model = agent id) and desktop bridge (model = app id) are keyless.
  if (config.provider === "cli" || config.provider === "bridge") return true;
  if (config.provider === "local" || config.provider === "custom") {
    return config.baseUrl.trim().length > 0; // key optional / not needed
  }
  return config.apiKey.trim().length > 0; // cloud providers
}

/** "localhost:11434" from an endpoint, for a compact label. */
function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** The single Ask Marco surface — a self-contained card for the dashboard. */
export function AskMarco() {
  const [config, setConfig] = useState<AiConfig>({
    provider: "anthropic",
    model: "claude-opus-4-8",
    apiKey: "",
    baseUrl: "",
  });
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const [connectTab, setConnectTab] = useState<ConnectTab>("your");
  const [cliAgents, setCliAgents] = useState<CliAgent[] | null>(null);
  const [runtimes, setRuntimes] = useState<LocalRuntime[] | null>(null);
  const [bridge, setBridge] = useState<BridgeStatus | null>(null);
  const [scanning, setScanning] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setConfig(JSON.parse(saved));
    } catch {
      // corrupted config — start fresh
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activity]);

  function updateConfig(patch: Partial<AiConfig>) {
    setConfig((previous) => {
      const next = { ...previous, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // storage unavailable — session-only config
      }
      return next;
    });
  }

  const connected = isConnected(config);

  /** Detect everything already available on this machine, in one pass. */
  async function scanAll() {
    setScanning(true);
    try {
      const [cli, local, br] = await Promise.all([
        aiCliDetect(),
        aiLocalDetect(),
        aiBridgeStatus(),
      ]);
      setCliAgents(cli);
      setRuntimes(local);
      setBridge(br);
    } catch {
      setCliAgents((c) => c ?? []);
      setRuntimes((r) => r ?? []);
    } finally {
      setScanning(false);
    }
  }

  function openTab(tab: ConnectTab) {
    setConnectTab(tab);
    if (tab === "your" && cliAgents === null && !scanning) void scanAll();
  }

  function toggleConnect() {
    setShowConnect((open) => {
      if (!open) {
        openTab(CLOUD_IDS.includes(config.provider) && connected ? "cloud" : "your");
      }
      return !open;
    });
  }

  function selectCli(agent: CliAgent) {
    updateConfig({ provider: "cli", model: agent.id, label: agent.label, apiKey: "", baseUrl: "" });
  }

  function selectLocal(runtime: LocalRuntime, model: string) {
    updateConfig({
      provider: "local",
      baseUrl: runtime.baseUrl,
      model,
      apiKey: "",
      label: runtime.label,
    });
  }

  function selectBridge(appId: string, label: string) {
    updateConfig({ provider: "bridge", model: appId, label, apiKey: "", baseUrl: "" });
  }

  const cloudProvider: AiProvider = CLOUD_IDS.includes(config.provider)
    ? config.provider
    : "anthropic";

  async function send(text?: string) {
    const question = (text ?? input).trim();
    if (!question || sending) return;
    if (!connected) {
      setShowConnect(true);
      openTab("your");
      setMessages((m) => [
        ...m,
        { role: "user", content: question },
        {
          role: "assistant",
          content:
            "Connect an AI first — pick one already on this Mac (your subscription or a local model, no API key), then I'm ready to chart your route.",
          error: true,
        },
      ]);
      setInput("");
      return;
    }

    const history: AiChatMessage[] = [
      ...messages
        .filter((m) => !m.error)
        .map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: question },
    ];

    setMessages((m) => [...m, { role: "user", content: question }]);
    setInput("");
    setActivity([]);
    setSending(true);

    try {
      const reply = await aiChat(
        {
          provider: config.provider,
          model: config.model.trim(),
          apiKey: config.apiKey.trim(),
          baseUrl: config.baseUrl.trim() || undefined,
          messages: history,
        },
        (event) => {
          if (event.type === "toolStart") {
            setActivity((a) => [
              ...a,
              { name: event.name, summary: event.summary, done: false, ok: true },
            ]);
          } else {
            setActivity((a) => {
              const next = [...a];
              for (let i = next.length - 1; i >= 0; i--) {
                if (next[i].name === event.name && !next[i].done) {
                  next[i] = { ...next[i], done: true, ok: event.ok };
                  break;
                }
              }
              return next;
            });
          }
        },
      );
      setMessages((m) => [
        ...m,
        { role: "assistant", content: reply.text, tools: reply.toolsUsed },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: toBackendError(err).message, error: true },
      ]);
    } finally {
      setSending(false);
      setActivity([]);
    }
  }

  const installedCli = (cliAgents ?? []).filter((a) => a.installed);
  const runningRuntimes = (runtimes ?? []).filter((r) => r.running);
  const bridgeInstalled = (bridge?.apps ?? []).filter((a) => a.installed);
  const bridgeOn = bridge?.enabled ?? false;
  const nothingDetected =
    cliAgents !== null &&
    !scanning &&
    installedCli.length === 0 &&
    runningRuntimes.length === 0 &&
    !(bridgeOn && bridgeInstalled.length > 0);

  const statusLine = sending
    ? "charting your route…"
    : connected
      ? config.provider === "local"
        ? `${config.label ?? "Local"} · ${config.model}`
        : config.provider === "cli"
          ? `${config.label ?? "CLI"} · your subscription`
          : config.provider === "bridge"
            ? `${config.label ?? "Desktop app"} · bridge`
            : config.model
      : "connect an AI to begin";

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {/* header — portrait + status + model toggle */}
      <div className="flex items-center gap-4 border-b border-border p-4">
        <MarcoFace thinking={sending} width={96} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <span className="font-serif text-2xl">Ask Marco</span>
            <span
              className={cn(
                "size-2.5 rounded-full",
                connected ? "bg-emerald-500" : "bg-muted-foreground/40",
              )}
              aria-label={connected ? "connected" : "not connected"}
            />
          </div>
          <p className="truncate text-sm text-muted-foreground">{statusLine}</p>
        </div>
        {connected ? (
          <button
            onClick={toggleConnect}
            className="rounded-lg border border-border bg-card p-2.5 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="AI settings"
            aria-expanded={showConnect}
          >
            <Settings2 className="size-5" />
          </button>
        ) : (
          <button
            onClick={toggleConnect}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-3.5 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 active:scale-[0.97]"
            aria-label="Connect your AI"
            aria-expanded={showConnect}
          >
            <PlugZap className="size-4" aria-hidden />
            Connect your AI
          </button>
        )}
      </div>

      {/* collapsible connect panel */}
      {showConnect && (
        <div className="rise-in flex flex-col gap-3 border-b border-border bg-secondary/40 p-3">
          {/* mode switch */}
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-secondary/60 p-1 text-sm">
            {CONNECT_TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => openTab(id)}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 font-medium transition-colors",
                  connectTab === id
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </button>
            ))}
          </div>

          {/* Your AI — everything on this Mac, no key */}
          {connectTab === "your" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  No API key — use what&apos;s already on this Mac.
                </p>
                <button
                  onClick={scanAll}
                  disabled={scanning}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                >
                  <RefreshCw className={cn("size-3.5", scanning && "animate-spin")} aria-hidden />
                  Rescan
                </button>
              </div>

              {scanning && cliAgents === null ? (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-3 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
                  Looking for your AI…
                </div>
              ) : (
                <>
                  {/* CLI agents — your subscription */}
                  {installedCli.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Your subscription
                      </p>
                      {installedCli.map((agent) => {
                        const active =
                          config.provider === "cli" && config.model === agent.id;
                        return (
                          <button
                            key={agent.id}
                            onClick={() => selectCli(agent)}
                            className={cn(
                              cardClass,
                              active
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-foreground hover:border-primary/40",
                            )}
                          >
                            {active ? (
                              <Check className="size-4" aria-hidden />
                            ) : (
                              <BadgeCheck className="size-4 text-primary" aria-hidden />
                            )}
                            {agent.label}
                            <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">
                              runs on your subscription
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Local model servers — on device */}
                  {runningRuntimes.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        On this device
                      </p>
                      {runningRuntimes.map((runtime) => (
                        <div key={runtime.id} className="rounded-lg border border-border bg-card p-2.5">
                          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                            <Cpu className="size-4 text-primary" aria-hidden />
                            {runtime.label}
                            <span className="text-xs font-normal text-muted-foreground">
                              {hostOf(runtime.baseUrl)}
                            </span>
                          </div>
                          {runtime.models.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {runtime.models.map((model) => {
                                const active =
                                  config.provider === "local" &&
                                  config.baseUrl === runtime.baseUrl &&
                                  config.model === model;
                                return (
                                  <button
                                    key={model}
                                    onClick={() => selectLocal(runtime, model)}
                                    className={cn(
                                      "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
                                      active
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                                    )}
                                  >
                                    {active && <Check className="size-3" aria-hidden />}
                                    {model}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              Running, but no model loaded —{" "}
                              <code className="rounded bg-muted px-1 py-0.5">{runtime.setupHint}</code>
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Desktop apps — the bridge */}
                  {bridgeOn && bridgeInstalled.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Desktop apps
                      </p>
                      {bridge && !bridge.accessibilityGranted && (
                        <button
                          onClick={() => void aiBridgeOpenSettings()}
                          className="rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-primary/10"
                        >
                          <span className="font-medium">Grant Accessibility permission</span> —
                          opens System Settings, so Marco can type into the app.
                        </button>
                      )}
                      {bridgeInstalled.map((app) => {
                        const active =
                          config.provider === "bridge" && config.model === app.id;
                        return (
                          <button
                            key={app.id}
                            onClick={() => selectBridge(app.id, app.label)}
                            className={cn(
                              cardClass,
                              active
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-foreground hover:border-primary/40",
                            )}
                          >
                            {active ? (
                              <Check className="size-4" aria-hidden />
                            ) : (
                              <MonitorSmartphone className="size-4" aria-hidden />
                            )}
                            {app.label}
                            <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">
                              {app.running ? "running · your subscription" : "your subscription"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Nothing found */}
                  {nothingDetected && (
                    <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                      <p className="mb-1.5 font-medium text-foreground">
                        Nothing detected on this Mac yet.
                      </p>
                      <p className="mb-2">Set up any of these and Rescan — or use an API key →</p>
                      <ul className="flex flex-col gap-1">
                        <li>
                          <span className="font-medium text-foreground">Claude Code · Codex · Gemini CLI</span>{" "}
                          — sign in once, runs on your subscription
                        </li>
                        <li>
                          <span className="font-medium text-foreground">Ollama</span> —{" "}
                          <code className="rounded bg-muted px-1 py-0.5">ollama pull llama3.1</code>, fully local
                        </li>
                      </ul>
                    </div>
                  )}

                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Subscription &amp; desktop agents are chat-only — for live flight/hotel
                    search, pick a local model or a cloud key.
                  </p>
                </>
              )}
            </div>
          )}

          {/* API key — cloud providers */}
          {connectTab === "cloud" && (
            <div className="flex flex-col gap-2.5">
              <select
                className={inputClass}
                value={cloudProvider}
                onChange={(e) => {
                  const provider = e.target.value as AiProvider;
                  const preset = CLOUD_PROVIDERS.find((p) => p.id === provider);
                  updateConfig({ provider, model: preset?.defaultModel ?? "" });
                }}
                aria-label="AI provider"
              >
                {CLOUD_PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id} className="bg-card">
                    {p.label}
                  </option>
                ))}
              </select>
              <input
                className={inputClass}
                placeholder="model, e.g. claude-opus-4-8"
                value={config.model}
                onChange={(e) => updateConfig({ model: e.target.value })}
                aria-label="Model name"
              />
              {config.provider === "custom" && (
                <input
                  className={inputClass}
                  placeholder="base URL, e.g. http://localhost:11434/v1"
                  value={config.baseUrl}
                  onChange={(e) => updateConfig({ baseUrl: e.target.value })}
                  aria-label="Base URL"
                />
              )}
              <input
                className={inputClass}
                type="password"
                placeholder={config.provider === "custom" ? "API key (optional)" : "API key"}
                value={config.apiKey}
                onChange={(e) => updateConfig({ apiKey: e.target.value })}
                aria-label="API key"
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Your key stays on this device and is sent only to your chosen model
                provider. Marco uses it to run the agent that calls the travel APIs.
              </p>
            </div>
          )}
        </div>
      )}

      {/* conversation */}
      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 && (
          <div className="mx-auto max-w-xl pt-10 text-center">
            <h2 className="font-serif text-4xl text-foreground">
              Where shall we go?
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              I aggregate live flights, hotels, and experiences, then chart the
              route and the budget. Ask me anything travel.
            </p>
            {!connected && (
              <button
                onClick={() => {
                  setShowConnect(true);
                  openTab("your");
                }}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-[15px] font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.98]"
              >
                <PlugZap className="size-5" aria-hidden />
                Connect your AI — no API key
              </button>
            )}
            <div className="mt-7 flex flex-col gap-3">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  style={{ animationDelay: `${i * 70}ms` }}
                  className="rise-in rounded-xl border border-border bg-card px-4 py-3.5 text-left text-[15px] text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5 active:scale-[0.99]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          {messages.map((message, index) =>
            message.role === "user" ? (
              <div
                key={index}
                className="rise-in self-end rounded-2xl rounded-br-sm bg-primary px-4 py-3 text-[15px] text-primary-foreground"
              >
                {message.content}
              </div>
            ) : (
              <div
                key={index}
                className={cn(
                  "rise-in self-start rounded-2xl rounded-bl-sm border px-5 py-3.5 text-[15px] leading-relaxed",
                  message.error
                    ? "border-destructive/30 bg-destructive/10 text-destructive"
                    : "border-border bg-card",
                )}
              >
                {message.tools && message.tools.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {[...new Set(message.tools)].map((tool) => (
                      <span
                        key={tool}
                        className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-primary"
                      >
                        <Wrench className="size-2.5" aria-hidden />
                        {TOOL_LABELS[tool] ?? tool}
                      </span>
                    ))}
                  </div>
                )}
                <div className="chat-markdown">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
            ),
          )}

          {sending && (
            <div className="rise-in self-start rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
                <span>consulting the maps</span>
                <span className="flex items-center gap-1" aria-hidden>
                  <span className="marco-dot size-1 rounded-full bg-primary" />
                  <span className="marco-dot size-1 rounded-full bg-primary" />
                  <span className="marco-dot size-1 rounded-full bg-primary" />
                </span>
              </div>
              {activity.length > 0 && (
                <ul className="mt-2 flex flex-col gap-1.5">
                  {activity.map((item, index) => (
                    <li key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                      {item.done ? (
                        item.ok ? (
                          <CircleCheck className="size-3.5 text-emerald-500" aria-hidden />
                        ) : (
                          <CircleX className="size-3.5 text-destructive" aria-hidden />
                        )
                      ) : (
                        <Loader2 className="size-3.5 animate-spin text-primary" aria-hidden />
                      )}
                      <span className="font-medium text-foreground">
                        {TOOL_LABELS[item.name] ?? item.name}
                      </span>
                      {item.summary}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* composer */}
      <div className="border-t border-border p-4">
        <div className="mx-auto flex max-w-2xl items-end gap-2.5">
          <textarea
            className={`${inputClass} max-h-40 min-h-12 resize-none`}
            rows={1}
            placeholder={
              connected ? "Ask Marco… (Enter to send)" : "Connect an AI, then ask away…"
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            aria-label="Message"
          />
          <button
            onClick={() => send()}
            disabled={sending || input.trim().length === 0}
            className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition hover:bg-primary/90 active:scale-95 disabled:opacity-40 disabled:active:scale-100"
            aria-label="Send"
          >
            <Send className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
