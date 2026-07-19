"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  Cpu,
  Loader2,
  MonitorSmartphone,
  RefreshCw,
  Terminal,
} from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import type {
  AiProvider,
  BridgeStatus,
  CliAgent,
  LocalRuntime,
} from "@/lib/tauri";
import {
  aiBridgeStatus,
  aiCliDetect,
  aiLocalDetect,
  type BridgeStatus as TauriBridgeStatus,
} from "@/lib/tauri";

const STORAGE_KEY = "marcopolo.ai.config";

interface AiConfig {
  provider: AiProvider;
  model: string;
  apiKey: string;
  baseUrl: string;
  label?: string;
}

interface AgentItem {
  id: string;
  label: string;
  description: string;
  kind: "cli" | "local" | "bridge" | "cloud";
  installed: boolean;
  active: boolean;
  onSelect: () => void;
}

export function AgentsSettings() {
  const [config, setConfig] = useState<AiConfig>(() => {
    if (typeof window === "undefined") {
      return {
        provider: "anthropic",
        model: "claude-opus-4-8",
        apiKey: "",
        baseUrl: "",
      };
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved) as AiConfig;
    } catch {}
    return {
      provider: "anthropic",
      model: "claude-opus-4-8",
      apiKey: "",
      baseUrl: "",
    };
  });
  const [cliAgents, setCliAgents] = useState<CliAgent[] | null>(null);
  const [runtimes, setRuntimes] = useState<LocalRuntime[] | null>(null);
  const [bridge, setBridge] = useState<BridgeStatus | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    void scanAll();
  }, []);

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
      setBridge(br as TauriBridgeStatus);
    } catch {
      setCliAgents((c) => c ?? []);
      setRuntimes((r) => r ?? []);
    } finally {
      setScanning(false);
    }
  }

  function selectAgent(patch: Partial<AiConfig>) {
    const next = { ...config, ...patch };
    setConfig(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  }

  const runningRuntimes = (runtimes ?? []).filter((r) => r.running);
  const bridgeInstalled = (bridge?.apps ?? []).filter((a) => a.installed);
  const bridgeOn = bridge?.enabled ?? false;

  const items: AgentItem[] = [
    // CLI agents are for coding, not travel search — hide them from the UI.
    ...runningRuntimes.flatMap((runtime) =>
      runtime.models.map((model) => ({
        id: `${runtime.id}-${model}`,
        label: `${runtime.label} · ${model}`,
        description: `Local model at ${runtime.baseUrl}. Live travel tools.`,
        kind: "local" as const,
        installed: true,
        active:
          config.provider === "local" &&
          config.baseUrl === runtime.baseUrl &&
          config.model === model,
        onSelect: () =>
          selectAgent({
            provider: "local",
            baseUrl: runtime.baseUrl,
            model,
            apiKey: "",
            label: runtime.label,
          }),
      })),
    ),
    ...(bridgeOn
      ? bridgeInstalled.map((app) => ({
          id: app.id,
          label: app.label,
          description: "Desktop app bridge. Live travel tools via magic trick.",
          kind: "bridge" as const,
          installed: true,
          active: config.provider === "bridge" && config.model === app.id,
          onSelect: () =>
            selectAgent({
              provider: "bridge",
              model: app.id,
              label: app.label,
              apiKey: "",
              baseUrl: "",
            }),
        }))
      : []),
  ];

  const activeItem = items.find((i) => i.active);

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-border px-6 py-5">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to chat
        </Link>
        <h1 className="font-serif text-3xl font-medium">Agents</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose the AI that powers Marco Polo. Your data stays on this device.
        </p>
      </div>

      <div className="flex-1 p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">
              {activeItem ? `Connected to ${activeItem.label}` : "No AI connected"}
            </p>
            <p className="text-xs text-muted-foreground">
              {activeItem
                ? "Marco will use this agent for chat and travel search."
                : "Pick an agent below or use an API key."}
            </p>
          </div>
          <button
            onClick={scanAll}
            disabled={scanning}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={cn("size-4", scanning && "animate-spin")} />
            Rescan
          </button>
        </div>

        {scanning && items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Looking for your AI…</p>
          </div>
        ) : items.length > 0 ? (
          <>
            <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm font-medium text-primary">Recommended for live travel search</p>
              <p className="mt-1 text-xs text-muted-foreground">
                A local model (Ollama), a desktop app bridge, or your own API key. These can call Marco Polo&apos;s
                flight and hotel tools directly.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={item.onSelect}
                  className={cn(
                    "flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition",
                    item.active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card hover:border-primary/40",
                  )}
                >
                  <div className="flex w-full items-center gap-2">
                    {item.kind === "cli" && (
                      <Terminal className={cn("size-5", item.active ? "text-primary" : "text-muted-foreground")} />
                    )}
                    {item.kind === "local" && (
                      <Cpu className={cn("size-5", item.active ? "text-primary" : "text-muted-foreground")} />
                    )}
                    {item.kind === "bridge" && (
                      <MonitorSmartphone className={cn("size-5", item.active ? "text-primary" : "text-muted-foreground")} />
                    )}
                    <span className="font-medium">{item.label}</span>
                    {item.active && <Check className="ml-auto size-4" />}
                  </div>
                  <span className="text-xs text-muted-foreground">{item.description}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-6 text-center">
            <p className="text-sm font-medium">No AI detected yet</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Install Claude Code, Ollama or another local runtime, then click Rescan.
            </p>
          </div>
        )}

        <div className="mt-8 border-t border-border pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Cloud API key
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Prefer a specific model? Paste your own key. It stays on this device.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <select
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              value={config.provider}
              onChange={(e) => {
                const provider = e.target.value as AiProvider;
                const preset: Record<string, string> = {
                  anthropic: "claude-opus-4-8",
                  openai: "gpt-5",
                  grok: "grok-4",
                  kimi: "kimi-k2",
                  custom: "",
                };
                selectAgent({ provider, model: preset[provider] ?? "" });
              }}
            >
              <option value="anthropic">Claude (Anthropic)</option>
              <option value="openai">OpenAI</option>
              <option value="grok">Grok (xAI)</option>
              <option value="kimi">Kimi (Moonshot)</option>
              <option value="custom">Custom (OpenAI-compatible)</option>
            </select>
            <input
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              placeholder="model, e.g. claude-opus-4-8"
              value={config.model}
              onChange={(e) => selectAgent({ model: e.target.value })}
            />
            {config.provider === "custom" && (
              <input
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 sm:col-span-2"
                placeholder="base URL, e.g. http://localhost:11434/v1"
                value={config.baseUrl}
                onChange={(e) => selectAgent({ baseUrl: e.target.value })}
              />
            )}
            <input
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 sm:col-span-2"
              type="password"
              placeholder={config.provider === "custom" ? "API key (optional)" : "API key"}
              value={config.apiKey}
              onChange={(e) => selectAgent({ apiKey: e.target.value })}
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Your key stays on this device and is sent only to the model provider.
          </p>
        </div>
      </div>
    </div>
  );
}
