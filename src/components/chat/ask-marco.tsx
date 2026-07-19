"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  CircleCheck,
  CircleX,
  Loader2,
  PlugZap,
  Send,
  Settings2,
  Sparkles,
  Wrench,
} from "lucide-react";
import gsap from "gsap";

import { MarcoFace } from "@/components/chat/marco-face";
import { AiConnectModal } from "@/components/chat/ai-connect-modal";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/components/animation/use-reduced-motion";
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
  const [cliAgents, setCliAgents] = useState<CliAgent[] | null>(null);
  const [runtimes, setRuntimes] = useState<LocalRuntime[] | null>(null);
  const [bridge, setBridge] = useState<BridgeStatus | null>(null);
  const [scanning, setScanning] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const emptyStateRef = useRef<HTMLDivElement>(null);
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
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" },
    );
  }, [messages, reduced]);

  useLayoutEffect(() => {
    if (reduced) return;
    const el = emptyStateRef.current;
    if (!el || messages.length > 0) return;
    const children = el.querySelectorAll("[data-animate]");
    gsap.fromTo(
      children,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: "power2.out" },
    );
  }, [messages.length, reduced]);

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
    setShowConnect(true);
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
      <div className="card-paper flex h-[min(780px,calc(100vh-13rem))] min-h-[460px] flex-col overflow-hidden rounded-3xl">
        {/* header */}
        <div className="flex items-center gap-4 border-b border-border/60 p-4">
          <MarcoFace thinking={sending} width={80} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <span className="font-serif text-2xl">Ask Marco</span>
              <span
                className={cn(
                  "size-2.5 rounded-full",
                  connected
                    ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.55)]"
                    : "bg-muted-foreground/40",
                )}
                aria-label={connected ? "connected" : "not connected"}
              />
            </div>
            <p className="truncate text-sm text-muted-foreground">{statusLine}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openConnect}
              className={cn(
                "flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition btn-press",
                connected
                  ? "border border-border bg-card text-foreground hover:bg-muted"
                  : "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
              )}
              aria-label="Connect your AI"
            >
              <PlugZap className="size-4" aria-hidden />
              {connected ? "AI connected" : "Connect your AI"}
            </button>
            <button
              onClick={openConnect}
              className="rounded-xl border border-border bg-card p-2.5 text-muted-foreground transition hover:text-foreground btn-press"
              aria-label="AI settings"
            >
              <Settings2 className="size-5" />
            </button>
          </div>
        </div>

        {/* conversation */}
        <div ref={messagesRef} className="flex-1 overflow-y-auto p-5">
          {messages.length === 0 && (
            <div ref={emptyStateRef} className="mx-auto max-w-xl pt-8 text-center">
              <div
                data-animate
                className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm"
              >
                <Sparkles className="size-8" aria-hidden />
              </div>
              <h2
                data-animate
                className="font-serif text-3xl text-foreground sm:text-4xl"
              >
                Where shall we go?
              </h2>
              <p data-animate className="mt-3 text-base text-muted-foreground">
                I aggregate live flights, hotels, and experiences, then chart the
                route and the budget. Ask me anything travel.
              </p>
              {!connected && (
                <button
                  data-animate
                  onClick={openConnect}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-[15px] font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 btn-press"
                >
                  <PlugZap className="size-5" aria-hidden />
                  Connect your AI — no API key
                </button>
              )}
              <div className="mt-7 flex flex-col gap-3">
                {SUGGESTIONS.map((s) => (
                  <button
                    data-animate
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-xl border border-border bg-card px-4 py-3.5 text-left text-[15px] text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5 btn-press"
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
                  data-message
                  className="self-end rounded-2xl rounded-br-md bg-primary px-4 py-3 text-[15px] text-primary-foreground shadow-sm"
                >
                  {message.content}
                </div>
              ) : (
                <div
                  key={index}
                  data-message
                  className={cn(
                    "self-start rounded-2xl rounded-bl-md border px-5 py-3.5 text-[15px] leading-relaxed shadow-sm",
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
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                  </div>
                </div>
              ),
            )}

            {sending &&
              !(
                messages[messages.length - 1]?.role === "assistant" &&
                messages[messages.length - 1]?.streaming
              ) && (
                <div
                  data-message
                  className="self-start rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3 shadow-sm"
                >
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
        <div className="border-t border-border/60 p-4">
          <div className="mx-auto flex max-w-2xl items-end gap-2.5">
            <textarea
              className="w-full flex-1 rounded-xl border border-border bg-card px-3.5 py-2.5 text-[15px] text-foreground placeholder:text-muted-foreground outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 max-h-40 min-h-12 resize-none"
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
              className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-40 btn-press"
              aria-label="Send"
            >
              <Send className="size-5" />
            </button>
          </div>
        </div>
      </div>

      <AiConnectModal
        open={showConnect}
        onClose={() => setShowConnect(false)}
        config={config}
        onUpdateConfig={updateConfig}
        cliAgents={cliAgents}
        runtimes={runtimes}
        bridge={bridge}
        scanning={scanning}
        onScan={scanAll}
      />
    </>
  );
}
