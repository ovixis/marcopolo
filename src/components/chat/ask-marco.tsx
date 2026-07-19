"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  CircleCheck,
  CircleX,
  Loader2,
  MapPin,
  PanelRight,
  Plus,
  Settings2,
} from "lucide-react";
import gsap from "gsap";

import { AiConnectModal } from "@/components/chat/ai-connect-modal";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatHero } from "@/components/chat/chat-hero";
import { ChatMessage } from "@/components/chat/chat-message";
import { useAppState } from "@/components/layout/app-shell";
import { TripPanel, type TripDetail } from "@/components/trip/trip-panel";
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

const INITIAL_DETAILS: TripDetail[] = [
  { key: "whereTo", label: "Where to", captured: false },
  { key: "whereFrom", label: "Where from", captured: false },
  { key: "who", label: "Who's coming", captured: false },
  { key: "when", label: "When you'd go", captured: false },
  { key: "what", label: "What you're after", captured: false },
];

function isConnected(config: AiConfig): boolean {
  if (config.model.trim().length === 0) return false;
  if (config.provider === "cli" || config.provider === "bridge") return true;
  if (config.provider === "local" || config.provider === "custom") {
    return config.baseUrl.trim().length > 0;
  }
  return config.apiKey.trim().length > 0;
}

function extractDetails(text: string, details: TripDetail[]): TripDetail[] {
  const lowered = text.toLowerCase();
  const next = details.map((d) => ({ ...d }));

  // Very lightweight entity extraction for demo UX.
  const cities = [
    "paris",
    "tokyo",
    "new york",
    "london",
    "rome",
    "barcelona",
    "kyoto",
    "osaka",
    "dubai",
    "bali",
    "maldives",
    "amsterdam",
    "sydney",
    "lisbon",
    "prague",
  ];

  for (const city of cities) {
    if (lowered.includes(city)) {
      if (!next[0].captured) {
        next[0].value = city.charAt(0).toUpperCase() + city.slice(1);
        next[0].captured = true;
      }
      break;
    }
  }

  if (/\b(from|leaving|departing out of|flying out of)\b/.test(lowered)) {
    const match = lowered.match(
      /(?:from|leaving|departing out of|flying out of)\s+([a-z\s]+?)(?:\s+(?:to|on|for|with|and|next|this)\b|$)/,
    );
    if (match && match[1]) {
      const value = match[1].trim();
      if (value.length > 2) {
        next[1].value = value.charAt(0).toUpperCase() + value.slice(1);
        next[1].captured = true;
      }
    }
  }

  if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|monday|tuesday|wednesday|thursday|friday|saturday|sunday|august|september|october|november|december)\b/.test(lowered)) {
    const match = lowered.match(
      /(?:\b(?:on|for|the)\s+)?((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:th|st|nd|rd)?(?:\s*,?\s*\d{4})?)/i,
    );
    if (match && match[1]) {
      next[3].value = match[1].trim();
      next[3].captured = true;
    }
  }

  if (/\b(couple|family|kids|friends|solo|alone|group of)\b/.test(lowered)) {
    const match = lowered.match(
      /\b(couple|family(?:\s+with\s+kids)?|friends|solo|alone|group of \d+)\b/i,
    );
    if (match && match[1]) {
      next[2].value = match[1].trim();
      next[2].captured = true;
    }
  }

  if (
    /\b(beach|mountain|city|culture|food|relax|adventure|romantic|budget|luxury|hiking|museum|nightlife|shopping)\b/.test(
      lowered,
    )
  ) {
    const match = lowered.match(
      /\b(beach|mountain|city(?!\s+from)|culture|food|relax|adventure|romantic|budget|luxury|hiking|museum|nightlife|shopping)\b/i,
    );
    if (match && match[1]) {
      next[4].value = match[1].trim();
      next[4].captured = true;
    }
  }

  return next;
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
  const [details, setDetails] = useState<TripDetail[]>(INITIAL_DETAILS);
  const [tripPanelOpen, setTripPanelOpen] = useState(false);
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
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" },
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

  function startNewTrip() {
    setMessages([]);
    setInput("");
    setActivity([]);
    setDetails(INITIAL_DETAILS);
    setTripPanelOpen(false);
  }

  async function send(text?: string) {
    const question = (text ?? input).trim();
    if (!question || sending) return;

    setDetails((prev) => extractDetails(question, prev));

    if (!connected) {
      openConnect();
      setMessages((m) => [
        ...m,
        { role: "user", content: question },
        {
          role: "assistant",
          content:
            "Connect your AI first — pick one already on this Mac (your subscription or a local model, no API key), then I'm ready to chart your route.",
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
                return [
                  ...m.slice(0, -1),
                  { ...last, content: last.content + event.text },
                ];
              }
              return [
                ...m,
                { role: "assistant", content: event.text, streaming: true },
              ];
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
        return [
          ...m,
          { role: "assistant", content: reply.text, tools: reply.toolsUsed },
        ];
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
      ? aiStatusLabel
      : "connect your AI to begin";

  const hasDetails = details.some((d) => d.captured);

  return (
    <>
      <div className="relative flex h-full flex-col">
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
              onClick={() => setTripPanelOpen((s) => !s)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition",
                tripPanelOpen || hasDetails
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <MapPin className="size-3.5" />
              Trip
            </button>
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
            <button
              onClick={() => setTripPanelOpen((s) => !s)}
              className={cn(
                "rounded-lg p-2 transition lg:hidden",
                tripPanelOpen
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              aria-label="Toggle trip panel"
            >
              <PanelRight className="size-4" />
            </button>
          </div>
        </div>

        {/* main surface */}
        <div className="relative flex min-h-0 flex-1">
          <div
            ref={messagesRef}
            className="flex-1 overflow-y-auto"
          >
            {messages.length === 0 ? (
              <ChatHero
                input={input}
                onInputChange={setInput}
                onSend={() => send()}
                onSuggestion={send}
                connected={connected}
                sending={sending}
              />
            ) : (
              <div className="pb-6">
                {messages.map((message, index) => (
                  <div key={index} data-message>
                    <ChatMessage message={message} />
                  </div>
                ))}

                {sending &&
                  !(
                    messages[messages.length - 1]?.role === "assistant" &&
                    messages[messages.length - 1]?.streaming
                  ) && (
                    <div data-message className="px-4 py-5 sm:px-6 lg:px-8">
                      <div className="mx-auto flex max-w-2xl gap-4">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          M
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2
                              className="size-4 animate-spin text-primary"
                              aria-hidden
                            />
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
                                <li
                                  key={index}
                                  className="flex items-center gap-2 text-xs text-muted-foreground"
                                >
                                  {item.done ? (
                                    item.ok ? (
                                      <CircleCheck
                                        className="size-3.5 text-emerald-500"
                                        aria-hidden
                                      />
                                    ) : (
                                      <CircleX
                                        className="size-3.5 text-destructive"
                                        aria-hidden
                                      />
                                    )
                                  ) : (
                                    <Loader2
                                      className="size-3.5 animate-spin text-primary"
                                      aria-hidden
                                    />
                                  )}
                                  <span className="font-medium text-foreground">
                                    {item.name}
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

          <TripPanel
            open={tripPanelOpen}
            onClose={() => setTripPanelOpen(false)}
            details={details}
            onGenerate={() => send("Build the trip plan from what we have so far.")}
            canGenerate={details.some((d) => d.captured)}
          />
        </div>

        {/* composer */}
        {messages.length > 0 && (
          <div className="shrink-0 border-t border-border bg-background/90 p-4 backdrop-blur-md">
            <ChatComposer
              value={input}
              onChange={setInput}
              onSend={() => send()}
              disabled={sending}
              placeholder={
                connected
                  ? "Ask Marco…"
                  : "Connect your AI to start planning"
              }
            />
          </div>
        )}
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
