"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowUp,
  CircleCheck,
  CircleX,
  Loader2,
  Plus,
  Settings2,
  Wrench,
} from "lucide-react";
import gsap from "gsap";

import { AiConnectModal } from "@/components/chat/ai-connect-modal";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/components/animation/use-reduced-motion";
import { useAppState } from "@/components/layout/app-shell";
import {
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

const STORAGE_KEY = "marcopolo.ai.config";

interface AiConfig {
  provider: AiProvider;
  model: string;
  apiKey: string;
  baseUrl: string;
  label?: string;
}

interface UiMessage {
  role: "user" | "assistant";
  content: string;
  tools?: string[];
  error?: boolean;
  streaming?: boolean;
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

function isConnected(config: AiConfig): boolean {
  if (config.model.trim().length === 0) return false;
  if (config.provider === "cli" || config.provider === "bridge") return true;
  if (config.provider === "local" || config.provider === "custom") {
    return config.baseUrl.trim().length > 0;
  }
  return config.apiKey.trim().length > 0;
}

export function AskMarco() {
  const {
    openTerminal,
    showAiConnect,
    openAiConnect,
    closeAiConnect,
    setAiConnected,
  } = useAppState();

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
  const [cliAgents, setCliAgents] = useState<CliAgent[] | null>(null);
  const [runtimes, setRuntimes] = useState<LocalRuntime[] | null>(null);
  const [bridge, setBridge] = useState<BridgeStatus | null>(null);
  const [scanning, setScanning] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setConfig(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activity]);

  useLayoutEffect(() => {
    if (reduced || messages.length === 0) return;
    const nodes = messagesRef.current?.querySelectorAll("[data-message]");
    if (!nodes || nodes.length === 0) return;
    gsap.fromTo(
      nodes[nodes.length - 1],
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" },
    );
  }, [messages, reduced]);

  function updateConfig(patch: Partial<AiConfig>) {
    setConfig((previous) => {
      const next = { ...previous, ...patch };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  const connected = isConnected(config);

  const aiStatusLabel =
    config.provider === "local"
      ? config.label ?? "Local"
      : config.provider === "cli"
        ? config.label ?? "CLI"
        : config.provider === "bridge"
          ? config.label ?? "Desktop app"
          : config.model;

  useEffect(() => {
    setAiConnected(connected, connected ? aiStatusLabel : undefined);
  }, [connected, aiStatusLabel, setAiConnected]);

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

  function openConnect() {
    openAiConnect();
    if (cliAgents === null && !scanning) void scanAll();
  }

  async function send(text?: string) {
    const question = (text ?? input).trim();
    if (!question || sending) return;
    if (!connected) {
      openConnect();
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
          if (event.type === "textDelta") {
            setMessages((m) => {
              const last = m[m.length - 1];
              if (last?.role === "assistant" && last.streaming) {
                return [...m.slice(0, -1), { ...last, content: last.content + event.text }];
              }
              return [...m, { role: "assistant", content: event.text, streaming: true }];
            });
            return;
          }
          if (event.type === "toolStart") {
            setActivity((a) => [
              ...a,
              { name: event.name, summary: event.summary, done: false, ok: true },
            ]);
          } else if (event.type === "toolEnd") {
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
      setMessages((m) => {
        const last = m[m.length - 1];
        if (last?.role === "assistant" && last.streaming) {
          return [
            ...m.slice(0, -1),
            { role: "assistant", content: reply.text || last.content, tools: reply.toolsUsed },
          ];
        }
        return [...m, { role: "assistant", content: reply.text, tools: reply.toolsUsed }];
      });
    } catch (err) {
      setMessages((m) => {
        const base =
          m[m.length - 1]?.role === "assistant" && m[m.length - 1]?.streaming
            ? m.slice(0, -1)
            : m;
        return [
          ...base,
          { role: "assistant", content: toBackendError(err).message, error: true },
        ];
      });
    } finally {
      setSending(false);
      setActivity([]);
    }
  }

  function startNewTrip() {
    setMessages([]);
    setInput("");
    setActivity([]);
  }

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
    <>
      <div className="flex h-full flex-col">
        {/* header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={startNewTrip}
              className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="New trip"
            >
              <Plus className="size-4" />
            </button>
            <div>
              <h1 className="text-sm font-medium">Ask Marco</h1>
              <p className="text-xs text-muted-foreground">{statusLine}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openConnect}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition",
                connected
                  ? "bg-primary/10 text-primary"
                  : "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  connected ? "bg-primary" : "bg-primary-foreground",
                )}
              />
              {connected ? "AI connected" : "Connect AI"}
            </button>
            <button
              onClick={openConnect}
              className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="AI settings"
            >
              <Settings2 className="size-4" />
            </button>
          </div>
        </div>

        {/* messages */}
        <div ref={messagesRef} className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 pb-20 text-center">
              <div className="mb-6 text-5xl">✦</div>
              <h2 className="font-serif text-3xl font-medium">Where shall we go?</h2>
              <p className="mt-3 max-w-md text-muted-foreground">
                Ask Marco to plan flights, hotels, and experiences — then manage the itinerary and budget.
              </p>
              <div className="mt-8 flex w-full max-w-md flex-col gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-xl border border-border bg-card px-4 py-3 text-left text-sm text-muted-foreground transition hover:border-primary/40 hover:bg-secondary/50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="pb-6">
              {messages.map((message, index) =>
                message.role === "user" ? (
                  <div
                    key={index}
                    data-message
                    className="flex justify-end border-b border-border/50 px-4 py-5 sm:px-6 lg:px-8"
                  >
                    <div className="max-w-2xl rounded-2xl rounded-br-md bg-secondary px-4 py-3 text-[15px] text-secondary-foreground">
                      {message.content}
                    </div>
                  </div>
                ) : (
                  <div
                    key={index}
                    data-message
                    className={cn(
                      "border-b border-border/50 px-4 py-5 sm:px-6 lg:px-8",
                      message.error ? "bg-destructive/5" : "",
                    )}
                  >
                    <div className="mx-auto flex max-w-2xl gap-4">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                        M
                      </div>
                      <div className="min-w-0 flex-1">
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
                        <div className={cn("chat-markdown text-[15px] leading-relaxed", message.error && "text-destructive")}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  </div>
                ),
              )}

              {sending &&
                !(
                  messages[messages.length - 1]?.role === "assistant" &&
                  messages[messages.length - 1]?.streaming
                ) && (
                  <div data-message className="border-b border-border/50 px-4 py-5 sm:px-6 lg:px-8">
                    <div className="mx-auto flex max-w-2xl gap-4">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                        M
                      </div>
                      <div className="min-w-0 flex-1">
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
                    </div>
                  </div>
                )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* composer */}
        <div className="shrink-0 border-t border-border bg-background/90 p-4 backdrop-blur-md">
          <div className="mx-auto flex max-w-2xl items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-lg">
            <textarea
              className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground outline-none"
              rows={1}
              placeholder={connected ? "Ask Marco…" : "Connect an AI to start planning"}
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
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40"
              aria-label="Send"
            >
              <ArrowUp className="size-5" />
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Marco uses your local AI. No data leaves your device unless you use a cloud key.
          </p>
        </div>
      </div>

      <AiConnectModal
        open={showAiConnect}
        onClose={closeAiConnect}
        config={config}
        onUpdateConfig={updateConfig}
        cliAgents={cliAgents}
        runtimes={runtimes}
        bridge={bridge}
        scanning={scanning}
        onScan={scanAll}
        onOpenTerminal={(cmd) => {
          closeAiConnect();
          openTerminal(cmd);
        }}
      />
    </>
  );
}
