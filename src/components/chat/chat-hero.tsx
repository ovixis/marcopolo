"use client";

import { useEffect, useRef } from "react";
import { Sparkles, Shield, Zap, Wallet } from "lucide-react";
import gsap from "gsap";

import { SuggestionPills } from "./suggestion-pills";
import { GlobeScene } from "@/components/scenes/globe-scene";
import { useReducedMotion } from "@/components/animation/use-reduced-motion";

interface ChatHeroProps {
  onSuggestion: (text: string) => void;
}

const SUGGESTIONS = [
  "Create a new trip",
  "Inspire me where to go",
  "Plan a road trip",
  "Plan a last-minute escape",
];

const BADGES = [
  { icon: Shield, label: "Your AI, your data" },
  { icon: Zap, label: "One-click connect" },
  { icon: Wallet, label: "No extra subscriptions" },
];

export function ChatHero({ onSuggestion }: ChatHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".hero-globe",
        { opacity: 0, scale: 0.92 },
        { opacity: 1, scale: 1, duration: 1, ease: "power3.out" },
      );
      gsap.fromTo(
        ".hero-title",
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", delay: 0.15 },
      );
      gsap.fromTo(
        ".hero-subtitle",
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power3.out", delay: 0.3 },
      );
      gsap.fromTo(
        ".hero-badge",
        { opacity: 0, y: 12, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.45, stagger: 0.08, ease: "back.out(1.4)", delay: 0.45 },
      );
      gsap.fromTo(
        ".hero-pills",
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", delay: 0.75 },
      );
    }, containerRef);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <div
      ref={containerRef}
      className="relative flex h-full flex-col items-center justify-center px-6 pb-4"
    >
      {/* globe backdrop */}
      <div className="hero-globe pointer-events-none absolute inset-0 opacity-60">
        <GlobeScene />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-2xl text-center">
        <div className="hero-title mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-lg shadow-primary/10">
          <Sparkles className="size-8" />
        </div>

        <h1 className="hero-title font-serif text-5xl leading-[1.05] tracking-tight text-foreground sm:text-6xl">
          Where shall we go <span className="text-gradient">today?</span>
        </h1>

        <p className="hero-subtitle mx-auto mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">
          Marco Polo is your open-source travel command center. Connect your
          own AI and plan trips without new subscriptions or API keys.
        </p>

        <div className="hero-subtitle mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
          {BADGES.map((badge) => (
            <span
              key={badge.label}
              className="hero-badge inline-flex items-center gap-1.5 rounded-full border border-border bg-card/80 px-3.5 py-1.5 backdrop-blur-sm"
            >
              <badge.icon className="size-4 text-primary" />
              {badge.label}
            </span>
          ))}
        </div>
      </div>

      <div className="hero-pills relative z-10 mt-10">
        <SuggestionPills suggestions={SUGGESTIONS} onSelect={onSuggestion} />
      </div>
    </div>
  );
}
