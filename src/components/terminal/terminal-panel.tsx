"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Play, Terminal, Trash, X } from "lucide-react";

import { runShellCommand } from "@/lib/tauri";
import { cn } from "@/lib/utils";

interface TerminalPanelProps {
  open: boolean;
  onClose: () => void;
  initialCommand?: string;
}

export function TerminalPanel({
  open,
  onClose,
  initialCommand,
}: TerminalPanelProps) {
  const [lines, setLines] = useState<
    { type: "in" | "out" | "err"; text: string }[]
  >([]);
  const [running, setRunning] = useState(false);
  const [command, setCommand] = useState(initialCommand ?? "");
  const bottomRef = useRef<HTMLDivElement>(null);
  const executedRef = useRef<string | undefined>(undefined);

  const runCommand = useCallback(
    async (cmd: string) => {
      if (!cmd.trim() || running) return;
      setRunning(true);
      setLines((prev) => [...prev, { type: "in", text: `> ${cmd}` }]);
      try {
        await runShellCommand(cmd, (event) => {
          switch (event.type) {
            case "stdout":
              setLines((prev) => [...prev, { type: "out", text: event.line }]);
              break;
            case "stderr":
              setLines((prev) => [...prev, { type: "err", text: event.line }]);
              break;
            case "done":
              setLines((prev) => [
                ...prev,
                { type: "out", text: `[exit ${event.code}]` },
              ]);
              break;
            case "error":
              setLines((prev) => [
                ...prev,
                { type: "err", text: event.message },
              ]);
              break;
          }
        });
      } catch (err) {
        setLines((prev) => [...prev, { type: "err", text: String(err) }]);
      } finally {
        setRunning(false);
      }
    },
    [running],
  );

  useEffect(() => {
    if (!initialCommand?.trim()) return;
    setCommand(initialCommand);
    if (executedRef.current === initialCommand) return;
    executedRef.current = initialCommand;
    void runCommand(initialCommand);
  }, [initialCommand, runCommand]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(lines.map((l) => l.text).join("\n"));
    } catch {}
  }

  if (!open) return null;

  return (
    <div className="flex h-[320px] shrink-0 flex-col border-t border-border bg-card">
      {/* header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Terminal className="size-4 text-primary" />
          <span>Terminal</span>
          {running && (
            <span className="ml-2 text-xs text-muted-foreground">running…</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={copyAll}
            className="rounded p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Copy output"
          >
            <Copy className="size-4" />
          </button>
          <button
            onClick={() => setLines([])}
            className="rounded p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Clear"
          >
            <Trash className="size-4" />
          </button>
          <button
            onClick={onClose}
            className="rounded p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* output */}
      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs">
        {lines.length === 0 && (
          <p className="text-muted-foreground">
            Terminal ready. Run a setup command below.
          </p>
        )}
        {lines.map((line, i) => (
          <div
            key={i}
            className={cn(
              "whitespace-pre-wrap break-words py-0.5",
              line.type === "in" && "text-primary",
              line.type === "err" && "text-destructive",
              line.type === "out" && "text-foreground",
            )}
          >
            {line.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* input */}
      <div className="flex items-center gap-2 border-t border-border p-3">
        <input
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") runCommand(command);
          }}
          placeholder="Type a command…"
          disabled={running}
        />
        <button
          onClick={() => runCommand(command)}
          disabled={running || !command.trim()}
          className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
        >
          <Play className="size-4" />
        </button>
      </div>
    </div>
  );
}
