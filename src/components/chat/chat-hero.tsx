"use client";

import { useEffect, useRef } from "react";
import { Shield, Zap, Wallet } from "lucide-react";
import gsap from "gsap";

import { SuggestionPills } from "./suggestion-pills";
import { MarcoFace } from "./marco-face";
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
        ".hero-title",
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", delay: 0.1 },
      );
      gsap.fromTo(
        ".hero-subtitle",
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power3.out", delay: 0.25 },
      );
      gsap.fromTo(
        ".hero-badge",
        { opacity: 0, y: 12, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.06, ease: "back.out(1.4)", delay: 0.4 },
      );
      gsap.fromTo(
        ".hero-pills",
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", delay: 0.6 },
      );
    }, containerRef);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <div
      ref={containerRef}
      className="relative flex h-full flex-col items-center justify-center px-6 pb-8"
    >
      <div className="relative z-10 mx-auto w-full max-w-3xl text-center">
        <div className="hero-title mb-8 flex justify-center">
          <MarcoFace size={5.6} />
        </div>

        <h1 className="hero-title font-serif text-5xl leading-[1.05] tracking-tight text-foreground sm:text-6xl md:text-7xl">
          Where shall we go <span className="text-primary">today?</span>
        </h1>

        <p className="hero-subtitle mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
          Marco Polo is your open-source travel command center. Connect your
          own AI and plan trips without new subscriptions or API keys.
        </p>

        <div className="hero-subtitle mt-10 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
          {BADGES.map((badge) => (
            <span
              key={badge.label}
              className="hero-badge inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2"
            >
              <badge.icon className="size-4 text-primary" />
              {badge.label}
            </span>
          ))}
        </div>
      </div>

      <div className="hero-pills relative z-10 mt-12">
        <SuggestionPills suggestions={SUGGESTIONS} onSelect={onSuggestion} />
      </div>
    </div>
  );
}
