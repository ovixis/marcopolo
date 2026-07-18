"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  CircleCheck,
  CircleX,
  Loader2,
  Plug,
  Send,
  Settings2,
  Wrench,
} from "lucide-react";

import { MarcoFace } from "@/components/chat/marco-face";
import { cn } from "@/lib/utils";
import {
  aiChat,
  toBackendError,
  type AiChatMessage,
  type AiProvider,
} from "@/lib/tauri";

const PROVIDERS: { id: AiProvider; label: string; defaultModel: string }[] = [
  { id: "anthropic", label: "Claude (Anthropic)", defaultModel: "claude-opus-4-8" },
  { id: "openai", label: "OpenAI", defaultModel: "gpt-5" },
  { id: "grok", label: "Grok (xAI)", defaultModel: "grok-4" },
  { id: "kimi", label: "Kimi (Moonshot)", defaultModel: "kimi-k2" },
  { id: "custom", label: "Custom (OpenAI-compatible)", defaultModel: "" },
];

const STORAGE_KEY = "marcopolo.ai.config";

interface AiConfig {
  provider: AiProvider;
  model: string;
  apiKey: string;
  baseUrl: string;
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
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20";

export function AskMarco({ compact = false }: { compact?: boolean }) {
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

  // Pick up a prompt handed off from elsewhere (e.g. the Overview command bar).
  useEffect(() => {
    try {
      const handoff = sessionStorage.getItem("marco.prefill");
      if (handoff) {
        sessionStorage.removeItem("marco.prefill");
        setInput(handoff);
      }
    } catch {
      // storage unavailable — nothing to hand off
    }
  }, []);

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

  const connected =
    config.apiKey.trim().length > 0 && config.model.trim().length > 0;

  async function send(text?: string) {
    const question = (text ?? input).trim();
    if (!question || sending) return;
    if (!connected) {
      setShowConnect(true);
      setMessages((m) => [
        ...m,
        { role: "user", content: question },
        {
          role: "assistant",
          content:
            "Connect a model first — pick a provider and paste your API key, then I'm ready to chart your route.",
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

  const connectForm = (
    <div className="flex flex-col gap-3">
      <select
        className={inputClass}
        value={config.provider}
        onChange={(e) => {
          const provider = e.target.value as AiProvider;
          const preset = PROVIDERS.find((p) => p.id === provider);
          updateConfig({ provider, model: preset?.defaultModel ?? "" });
        }}
        aria-label="AI provider"
      >
        {PROVIDERS.map((p) => (
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
        placeholder="API key"
        value={config.apiKey}
        onChange={(e) => updateConfig({ apiKey: e.target.value })}
        aria-label="API key"
      />
      <p className="text-xs leading-relaxed text-muted-foreground">
        Your key stays on this device and is sent only to your chosen model
        provider. Marco uses it to run the agent that calls the travel APIs.
      </p>
    </div>
  );

  const conversation = (
    <>
      {messages.length === 0 && (
        <div
          className={cn(
            "mx-auto text-center",
            compact ? "max-w-md pt-6" : "max-w-lg pt-16",
          )}
        >
          <h2
            className={cn(
              "font-serif text-foreground",
              compact ? "text-2xl" : "text-3xl",
            )}
          >
            Where shall we go?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            I aggregate live flights, hotels, and experiences, then chart the
            route and the budget. Ask me anything travel.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-xl border border-border bg-card px-3.5 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={cn("mx-auto flex flex-col gap-4", compact ? "max-w-xl" : "max-w-2xl")}>
        {messages.map((message, index) =>
          message.role === "user" ? (
            <div
              key={index}
              className="self-end rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground"
            >
              {message.content}
            </div>
          ) : (
            <div
              key={index}
              className={cn(
                "self-start rounded-2xl rounded-bl-sm border px-4 py-3 text-sm leading-relaxed",
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
          <div className="self-start rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
              consulting the maps…
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
    </>
  );

  const composer = (
    <div className={cn("mx-auto flex items-end gap-2", compact ? "max-w-xl" : "max-w-2xl")}>
      <textarea
        className={`${inputClass} max-h-40 min-h-11 resize-none`}
        rows={1}
        placeholder={
          connected
            ? "Ask Marco… (Enter to send)"
            : "Connect a model, then ask away…"
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
        className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
        aria-label="Send"
      >
        <Send className="size-4" />
      </button>
    </div>
  );

  // ===== compact: a single self-contained card for the dashboard =====
  if (compact) {
    return (
      <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex items-center gap-3 border-b border-border p-3">
          <MarcoFace thinking={sending} size={2.7} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-serif text-lg">Ask Marco</span>
              <span
                className={cn(
                  "size-2 rounded-full",
                  connected ? "bg-emerald-500" : "bg-muted-foreground/40",
                )}
                aria-label={connected ? "connected" : "not connected"}
              />
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {sending
                ? "charting your route…"
                : connected
                  ? config.model
                  : "connect a model to begin"}
            </p>
          </div>
          <button
            onClick={() => setShowConnect((v) => !v)}
            className="rounded-lg border border-border bg-card p-2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Model settings"
            aria-expanded={showConnect}
          >
            <Settings2 className="size-4" />
          </button>
        </div>

        {showConnect && (
          <div className="border-b border-border bg-secondary/40 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Plug className="size-4 text-primary" aria-hidden />
              Your model
            </div>
            {connectForm}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">{conversation}</div>
        <div className="border-t border-border p-3">{composer}</div>
      </div>
    );
  }

  // ===== full: the immersive /chat page =====
  return (
    <div className="flex h-full bg-background text-foreground">
      <div className="flex w-80 shrink-0 flex-col border-r border-border">
        <div className="flex items-center justify-center border-b border-border p-6">
          <MarcoFace thinking={sending} size={5.6} />
        </div>
        <div className="px-5 py-3 text-center text-xs uppercase tracking-[0.3em] text-primary/80">
          {sending ? "charting your route…" : "Marco · at your service"}
        </div>
        <div className="flex flex-col gap-3 border-t border-border p-5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Plug className="size-4 text-primary" aria-hidden />
            Your model
            <span
              className={cn(
                "ml-auto size-2 rounded-full",
                connected ? "bg-emerald-500" : "bg-muted-foreground/40",
              )}
              aria-label={connected ? "connected" : "not connected"}
            />
          </div>
          {connectForm}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto px-8 py-8">{conversation}</div>
        <div className="border-t border-border p-4">{composer}</div>
      </div>
    </div>
  );
}
