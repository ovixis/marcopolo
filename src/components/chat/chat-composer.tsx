"use client";

import { ArrowUp, Mic, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatComposer({
  value,
  onChange,
  onSend,
  disabled,
  placeholder,
}: ChatComposerProps) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="flex items-end gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm transition focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20">
        <button
          type="button"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Attach"
        >
          <Paperclip className="size-5" />
        </button>
        <textarea
          className="max-h-40 min-h-[56px] flex-1 resize-none bg-transparent px-2 py-3 text-base text-foreground placeholder:text-muted-foreground outline-none"
          rows={1}
          placeholder={placeholder ?? "Ask Marco…"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          aria-label="Message"
        />
        <button
          type="button"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="Voice"
        >
          <Mic className="size-5" />
        </button>
        <button
          type="button"
          onClick={onSend}
          disabled={disabled || value.trim().length === 0}
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40",
          )}
          aria-label="Send"
        >
          <ArrowUp className="size-5" />
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Marco uses your local AI. No data leaves your device unless you use a cloud key.
      </p>
    </div>
  );
}
