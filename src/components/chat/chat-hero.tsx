"use client";

import { Sparkles, Shield, Zap, Wallet } from "lucide-react";
import { SuggestionPills } from "./suggestion-pills";

interface ChatHeroProps {
  onSuggestion: (text: string) => void;
}

const SUGGESTIONS = [
  "Create a new trip",
  "Inspire me where to go",
  "Plan a road trip",
  "Plan a last-minute escape",
];

export function ChatHero({ onSuggestion }: ChatHeroProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 pb-4">
      <div className="relative mx-auto w-full max-w-2xl text-center">
        {/* glow */}
        <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-lg shadow-primary/10">
            <Sparkles className="size-8" />
          </div>

          <h1 className="font-serif text-5xl leading-[1.05] tracking-tight text-foreground sm:text-6xl">
            Where shall we go today?
          </h1>

          <p className="mx-auto mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">
            Marco Polo is your open-source travel command center. Connect your
            own AI and plan trips without new subscriptions or API keys.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5">
              <Shield className="size-4 text-primary" />
              Your AI, your data
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5">
              <Zap className="size-4 text-primary" />
              One-click connect
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5">
              <Wallet className="size-4 text-primary" />
              No extra subscriptions
            </span>
          </div>
        </div>
      </div>

      <div className="relative mt-10">
        <SuggestionPills suggestions={SUGGESTIONS} onSelect={onSuggestion} />
      </div>
    </div>
  );
}
