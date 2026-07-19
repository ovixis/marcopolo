"use client";

import Image from "next/image";
import { Sparkles } from "lucide-react";
import { ChatComposer } from "./chat-composer";
import { SuggestionPills } from "./suggestion-pills";

interface ChatHeroProps {
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onSuggestion: (text: string) => void;
  connected: boolean;
  sending: boolean;
}

const SUGGESTIONS = [
  "Create a new trip",
  "Inspire me where to go",
  "Plan a road trip",
  "Plan a last-minute escape",
];

export function ChatHero({
  input,
  onInputChange,
  onSend,
  onSuggestion,
  connected,
  sending,
}: ChatHeroProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 pb-8">
      <div className="mx-auto grid w-full max-w-5xl items-center gap-12 lg:grid-cols-[1fr_0.9fr]">
        <div className="text-center lg:text-left">
          <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary lg:mb-8">
            <Sparkles className="size-7" />
          </div>
          <h1 className="font-serif text-4xl leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Where shall we go today?
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Your personal AI plans the trip, Marco keeps every detail in one
            elegant place.
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-sm lg:max-w-md">
          <div className="relative aspect-square">
            <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-br from-primary/20 via-primary/5 to-transparent blur-2xl" />
            <Image
              src="/marco-portrait.png"
              alt="Marco Polo"
              fill
              className="object-contain drop-shadow-2xl"
              priority
            />
          </div>
        </div>
      </div>

      <div className="mt-10 w-full max-w-2xl">
        <ChatComposer
          value={input}
          onChange={onInputChange}
          onSend={onSend}
          disabled={sending}
          placeholder={
            connected
              ? "Ask Marco to plan your next trip…"
              : "Connect your AI to start planning"
          }
        />
      </div>

      <div className="mt-6">
        <SuggestionPills suggestions={SUGGESTIONS} onSelect={onSuggestion} />
      </div>
    </div>
  );
}
