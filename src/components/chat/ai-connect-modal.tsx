"use client";

import { useState } from "react";
import {
  Check,
  Cloud,
  Copy,
  Loader2,
  Terminal,
  Wand2,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type {
  AiProvider,
  BridgeStatus,
  CliAgent,
  LocalRuntime,
} from "@/lib/tauri";

const CLOUD_PROVIDERS: { id: AiProvider; label: string; defaultModel: string }[] = [
  { id: "anthropic", label: "Claude (Anthropic)", defaultModel: "claude-opus-4-8" },
  { id: "openai", label: "OpenAI", defaultModel: "gpt-5" },
  { id: "grok", label: "Grok (xAI)", defaultModel: "grok-4" },
  { id: "kimi", label: "Kimi (Moonshot)", defaultModel: "kimi-k2" },
  { id: "custom", label: "Custom (OpenAI-compatible)", defaultModel: "" },
];

const ONE_CLICK_COMMANDS = [
  {
    id: "claude-code",
    name: "Claude Code",
    description: "Use the Claude Code CLI you already have on this Mac. Supports live travel tools.",
    command: "brew install claude && claude login",
  },
  {
    id: "ollama",
    name: "Ollama (local)",
    description: "Run a local model. No cloud account needed.",
    command: "brew install ollama && ollama pull qwen2.5:14b",
  },
];

interface AiConnectModalProps {
  open: boolean;
  onClose: () => void;
  config: {
    provider: AiProvider;
    model: string;
    apiKey: string;
    baseUrl: string;
    label?: string;
  };
  onUpdateConfig: (patch: Partial<AiConnectModalProps["config"]>) => void;
  cliAgents: CliAgent[] | null;
  runtimes: LocalRuntime[] | null;
  bridge: BridgeStatus | null;
  scanning: boolean;
  onScan: () => void;
  onOpenTerminal?: (command: string) => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {}
      }}
      className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-xs text-muted-foreground transition hover:text-foreground"
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function AiConnectModal({
  open,
  onClose,
  config,
  onUpdateConfig,
  cliAgents,
  runtimes,
  bridge,
  scanning,
  onScan,
  onOpenTerminal,
}: AiConnectModalProps) {
  const [showApiKey, setShowApiKey] = useState(false);

  if (!open) return null;

  const installedCli = (cliAgents ?? []).filter((a) => a.installed);
  const runningRuntimes = (runtimes ?? []).filter((r) => r.running);
  const bridgeInstalled = (bridge?.apps ?? []).filter((a) => a.installed);
  const bridgeOn = bridge?.enabled ?? false;

  const detected =
    installedCli[0] ??
    runningRuntimes[0] ??
    (bridgeOn && bridgeInstalled.length > 0 ? bridgeInstalled[0] : undefined);

  function runInTerminal(command: string) {
    onOpenTerminal?.(command);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative z-10 flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Wand2 className="size-5" aria-hidden />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Connect your AI</h2>
              <p className="text-xs text-muted-foreground">Use the AI you already own</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5">
          {scanning ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Looking for your AI…</p>
            </div>
          ) : (
            <>
              {detected ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Found an AI on this Mac. Click below to connect.
                  </p>
                  {installedCli.map((agent) => {
                    const active = config.provider === "cli" && config.model === agent.id;
                    return (
                      <button
                        key={agent.id}
                        onClick={() =>
                          onUpdateConfig({
                            provider: "cli",
                            model: agent.id,
                            label: agent.label,
                            apiKey: "",
                            baseUrl: "",
                          })
                        }
                        className={cn(
                          "flex w-full items-center justify-between rounded-xl border p-4 text-left transition",
                          active
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-secondary/50 hover:border-primary/40",
                        )}
                      >
                        <span className="font-medium">{agent.label}</span>
                        {active && <Check className="size-4" />}
                      </button>
                    );
                  })}

                  {runningRuntimes.map((runtime) => (
                    <button
                      key={runtime.id}
                      onClick={() =>
                        onUpdateConfig({
                          provider: "local",
                          baseUrl: runtime.baseUrl,
                          model: runtime.models[0] ?? "",
                          apiKey: "",
                          label: runtime.label,
                        })
                      }
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl border p-4 text-left transition",
                        config.provider === "local" && config.baseUrl === runtime.baseUrl
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-secondary/50 hover:border-primary/40",
                      )}
                    >
                      <span className="font-medium">{runtime.label}</span>
                      {config.provider === "local" && config.baseUrl === runtime.baseUrl && (
                        <Check className="size-4" />
                      )}
                    </button>
                  ))}

                  {bridgeOn &&
                    bridgeInstalled.map((app) => {
                      const active = config.provider === "bridge" && config.model === app.id;
                      return (
                        <button
                          key={app.id}
                          onClick={() =>
                            onUpdateConfig({
                              provider: "bridge",
                              model: app.id,
                              label: app.label,
                              apiKey: "",
                              baseUrl: "",
                            })
                          }
                          className={cn(
                            "flex w-full items-center justify-between rounded-xl border p-4 text-left transition",
                            active
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-secondary/50 hover:border-primary/40",
                          )}
                        >
                          <span className="font-medium">{app.label}</span>
                          {active && <Check className="size-4" />}
                        </button>
                      );
                    })}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Marco Polo does not sell AI access. Connect the AI you already pay for or run locally.
                  </p>

                  {ONE_CLICK_COMMANDS.map((option) => (
                    <div
                      key={option.id}
                      className="rounded-xl border border-border bg-secondary/30 p-4"
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="font-medium">{option.name}</span>
                        <div className="flex gap-2">
                          <CopyButton text={option.command} />
                          <button
                            onClick={() => runInTerminal(option.command)}
                            className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
                          >
                            <Terminal className="size-3" />
                            Run
                          </button>
                        </div>
                      </div>
                      <p className="mb-3 text-xs text-muted-foreground">{option.description}</p>
                      <code className="block rounded-lg bg-muted px-3 py-2 text-[11px] text-foreground">
                        {option.command}
                      </code>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                <button
                  onClick={onScan}
                  disabled={scanning}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
                >
                  <Loader2 className={cn("size-3.5", scanning && "animate-spin")} />
                  Rescan
                </button>
                <button
                  onClick={() => setShowApiKey((s) => !s)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                >
                  <Cloud className="size-3.5" />
                  {showApiKey ? "Hide API key" : "Use API key"}
                </button>
              </div>

              {showApiKey && (
                <div className="mt-4 space-y-3 rounded-xl border border-border bg-secondary/50 p-4">
                  <select
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                    value={config.provider}
                    onChange={(e) => {
                      const provider = e.target.value as AiProvider;
                      const preset = CLOUD_PROVIDERS.find((p) => p.id === provider);
                      onUpdateConfig({ provider, model: preset?.defaultModel ?? "" });
                    }}
                  >
                    {CLOUD_PROVIDERS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                    placeholder="model, e.g. claude-opus-4-8"
                    value={config.model}
                    onChange={(e) => onUpdateConfig({ model: e.target.value })}
                  />
                  {config.provider === "custom" && (
                    <input
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                      placeholder="base URL, e.g. http://localhost:11434/v1"
                      value={config.baseUrl}
                      onChange={(e) => onUpdateConfig({ baseUrl: e.target.value })}
                    />
                  )}
                  <input
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                    type="password"
                    placeholder={config.provider === "custom" ? "API key (optional)" : "API key"}
                    value={config.apiKey}
                    onChange={(e) => onUpdateConfig({ apiKey: e.target.value })}
                  />
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Your key stays on this device and is sent only to the model provider.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
