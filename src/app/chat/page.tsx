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
  Wrench,
} from "lucide-react";

import { MarcoFace } from "@/components/chat/marco-face";
import {
  aiChat,
  toBackendError,
  type AiChatMessage,
  type AiProvider,
} from "@/lib/tauri";

const PROVIDERS: { id: AiProvider; label: string; defaultModel: string }[] = [
  { id: "anthropic", label: "Claude (Anthropic)", defaultModel: "claude-sonnet-5" },
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
  "Plan 4 days in Rome from New York in October: flights, a hotel near the center, food experiences, total budget for 2.",
  "Cheapest nonstop JFK → LHR on August 17?",
  "Weekend in Paris under €800 for two — build me the full plan.",
];

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20";

export default function ChatPage() {
  const [config, setConfig] = useState<AiConfig>({
    provider: "anthropic",
    model: "claude-sonnet-5",
    apiKey: "",
    baseUrl: "",
  });
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
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

  const connected = config.apiKey.trim().length > 0 && config.model.trim().length > 0;

  async function send(text?: string) {
    const question = (text ?? input).trim();
    if (!question || sending) return;
    if (!connected) {
      setMessages((m) => [
        ...m,
        { role: "user", content: question },
        {
          role: "assistant",
          content:
            "Connect a model first: pick a provider on the left, paste your API key, and I'm ready to chart your route.",
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

  return (
    <div className="flex h-full bg-[#050B14] text-slate-200">
      {/* ===== left: face + connection ===== */}
      <div className="flex w-80 shrink-0 flex-col border-r border-white/10">
        <div className="h-72 border-b border-white/10">
          <MarcoFace thinking={sending} />
        </div>
        <div className="px-5 py-3 text-center text-xs uppercase tracking-[0.3em] text-cyan-300/80">
          {sending ? "charting your route…" : "Marco · at your service"}
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 p-5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Plug className="size-4 text-cyan-300" aria-hidden />
            Your model
            <span
              className={`ml-auto size-2 rounded-full ${connected ? "bg-emerald-400" : "bg-slate-600"}`}
              aria-label={connected ? "connected" : "not connected"}
            />
          </div>

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
              <option key={p.id} value={p.id} className="bg-[#0A1626]">
                {p.label}
              </option>
            ))}
          </select>

          <input
            className={inputClass}
            placeholder="model, e.g. claude-sonnet-5"
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
          <p className="text-xs leading-relaxed text-slate-500">
            Your key stays on this device and is sent only to your chosen
            model provider. Marco uses it to run the agent that calls the
            travel APIs.
          </p>
        </div>
      </div>

      {/* ===== right: conversation ===== */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto px-8 py-8">
          {messages.length === 0 && (
            <div className="mx-auto max-w-lg pt-16 text-center">
              <h1 className="font-serif text-3xl text-slate-100">
                Where shall we go?
              </h1>
              <p className="mt-3 text-sm text-slate-400">
                I aggregate live flights, hotels, and experiences, then chart
                the route and the budget. Ask me anything travel.
              </p>
              <div className="mt-8 flex flex-col gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm text-slate-300 transition-colors hover:border-cyan-400/40 hover:bg-cyan-400/5"
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
                  className="self-end rounded-2xl rounded-br-sm bg-cyan-600/90 px-4 py-2.5 text-sm text-white"
                >
                  {message.content}
                </div>
              ) : (
                <div
                  key={index}
                  className={`self-start rounded-2xl rounded-bl-sm border px-4 py-3 text-sm leading-relaxed ${
                    message.error
                      ? "border-red-400/30 bg-red-950/40 text-red-200"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  {message.tools && message.tools.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {[...new Set(message.tools)].map((tool) => (
                        <span
                          key={tool}
                          className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-cyan-300"
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
              <div className="self-start rounded-2xl rounded-bl-sm border border-white/10 bg-white/5 px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Loader2 className="size-4 animate-spin text-cyan-300" aria-hidden />
                  consulting the maps…
                </div>
                {activity.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {activity.map((item, index) => (
                      <li
                        key={index}
                        className="flex items-center gap-2 text-xs text-slate-400"
                      >
                        {item.done ? (
                          item.ok ? (
                            <CircleCheck className="size-3.5 text-emerald-400" aria-hidden />
                          ) : (
                            <CircleX className="size-3.5 text-red-400" aria-hidden />
                          )
                        ) : (
                          <Loader2 className="size-3.5 animate-spin text-cyan-300" aria-hidden />
                        )}
                        <span className="font-medium text-slate-300">
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

        <div className="border-t border-white/10 p-4">
          <div className="mx-auto flex max-w-2xl items-end gap-2">
            <textarea
              className={`${inputClass} max-h-40 min-h-11 resize-none`}
              rows={1}
              placeholder={
                connected
                  ? "Ask Marco… (Enter to send, Shift+Enter for a new line)"
                  : "Connect a model on the left, then ask away…"
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
              className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-cyan-500 text-white transition-colors hover:bg-cyan-400 disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
