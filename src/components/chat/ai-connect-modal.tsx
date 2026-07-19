"use client";

import { useState } from "react";
import {
  BadgeCheck,
  Check,
  Cloud,
  Copy,
  Cpu,
  Loader2,
  MonitorSmartphone,
  RefreshCw,
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
  const nothingDetected =
    cliAgents !== null &&
    !scanning &&
    installedCli.length === 0 &&
    runningRuntimes.length === 0 &&
    !(bridgeOn && bridgeInstalled.length > 0);

  function runInTerminal(command: string) {
    onOpenTerminal?.(command);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative z-10 flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Wand2 className="size-5" aria-hidden />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Connect your AI</h2>
              <p className="text-xs text-muted-foreground">No API key needed for local agents</p>
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

        <div className="max-h-[70vh] overflow-y-auto p-6">
          {scanning && cliAgents === null ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Looking for your AI…</p>
            </div>
          ) : (
            <>
              {/* Detected options */}
              <div className="grid gap-3 sm:grid-cols-2">
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
                        "flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition",
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-secondary/50 hover:border-primary/40",
                      )}
                    >
                      <div className="flex w-full items-center gap-2">
                        <BadgeCheck className={cn("size-5", active ? "text-primary" : "text-muted-foreground")} />
                        <span className="font-medium">{agent.label}</span>
                        {active && <Check className="ml-auto size-4" />}
                      </div>
                      <span className="text-xs text-muted-foreground">Runs on your subscription</span>
                    </button>
                  );
                })}

                {runningRuntimes.map((runtime) => (
                  <div key={runtime.id} className="rounded-xl border border-border bg-secondary/50 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <Cpu className="size-5 text-primary" />
                      <span className="font-medium">{runtime.label}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{new URL(runtime.baseUrl).host}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {runtime.models.map((model) => {
                        const active =
                          config.provider === "local" &&
                          config.baseUrl === runtime.baseUrl &&
                          config.model === model;
                        return (
                          <button
                            key={model}
                            onClick={() =>
                              onUpdateConfig({
                                provider: "local",
                                baseUrl: runtime.baseUrl,
                                model,
                                apiKey: "",
                                label: runtime.label,
                              })
                            }
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-xs transition",
                              active
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                            )}
                          >
                            {model}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {bridgeOn && bridgeInstalled.map((app) => {
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
                        "flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition",
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-secondary/50 hover:border-primary/40",
                      )}
                    >
                      <div className="flex w-full items-center gap-2">
                        <MonitorSmartphone className={cn("size-5", active ? "text-primary" : "text-muted-foreground")} />
                        <span className="font-medium">{app.label}</span>
                        {active && <Check className="ml-auto size-4" />}
                      </div>
                      <span className="text-xs text-muted-foreground">Desktop app bridge</span>
                    </button>
                  );
                })}
              </div>

              {/* Nothing found */}
              {nothingDetected && (
                <div className="mt-5 rounded-xl border border-dashed border-border bg-secondary/30 p-5">
                  <p className="mb-1 text-sm font-medium">No AI detected yet</p>
                  <p className="mb-4 text-xs text-muted-foreground">
                    Install one of these with a single command, then click Rescan.
                  </p>
                  <div className="space-y-3">
                    <div className="rounded-lg border border-border bg-card p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium">Ollama — fully local, no key</span>
                        <div className="flex gap-2">
                          <CopyButton text="brew install ollama && ollama pull qwen2.5:14b" />
                          <button
                            onClick={() => runInTerminal("brew install ollama && ollama pull qwen2.5:14b")}
                            className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
                          >
                            <Terminal className="size-3" />
                            Run
                          </button>
                        </div>
                      </div>
                      <code className="block rounded-lg bg-muted px-3 py-2 text-[11px] text-foreground">
                        brew install ollama && ollama pull qwen2.5:14b
                      </code>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium">Claude Code — your subscription</span>
                        <div className="flex gap-2">
                          <CopyButton text="brew install claude && claude login" />
                          <button
                            onClick={() => runInTerminal("brew install claude && claude login")}
                            className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground transition hover:bg-primary/90"
                          >
                            <Terminal className="size-3" />
                            Run
                          </button>
                        </div>
                      </div>
                      <code className="block rounded-lg bg-muted px-3 py-2 text-[11px] text-foreground">
                        brew install claude && claude login
                      </code>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-5 flex items-center justify-between">
                <button
                  onClick={onScan}
                  disabled={scanning}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
                >
                  <RefreshCw className={cn("size-3.5", scanning && "animate-spin")} />
                  Rescan
                </button>
                <button
                  onClick={() => setShowApiKey((s) => !s)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                >
                  <Cloud className="size-3.5" />
                  {showApiKey ? "Hide API key" : "Use API key instead"}
                </button>
              </div>

              {/* API key section */}
              {showApiKey && (
                <div className="mt-4 space-y-3 rounded-xl border border-border bg-secondary/50 p-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Terminal className="size-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Cloud provider</span>
                  </div>
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
