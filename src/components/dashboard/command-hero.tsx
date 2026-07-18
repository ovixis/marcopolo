"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { ArrowUpRight, Sparkles } from "lucide-react";

import { Globe } from "@/components/dashboard/globe";
import { demoTrip } from "@/lib/demo-dashboard";

const CHIPS = [
  "Plan 4 days in Kyoto & Osaka with a mid-range hotel",
  "Cheapest nonstop from New York to Tokyo in August",
  "A rainy-day itinerary for Lisbon under €120",
];

/** Send a prompt into Ask Marco. The chat page picks up the handoff on mount. */
function openMarco(router: ReturnType<typeof useRouter>, prompt: string) {
  try {
    sessionStorage.setItem("marco.prefill", prompt);
  } catch {
    // storage unavailable — the chat still opens, just without the prefill
  }
  router.push("/chat");
}

export function CommandHero() {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const items = panel.querySelectorAll("[data-hero-item]");
    const tween = gsap.from(items, {
      opacity: 0,
      y: 18,
      duration: 0.7,
      stagger: 0.08,
      ease: "power3.out",
      delay: 0.1,
    });
    return () => {
      tween.kill();
    };
  }, []);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = inputRef.current?.value.trim();
    if (value) openMarco(router, value);
  }

  const hour = new Date().getHours();
  const greeting =
    hour < 5
      ? "Still awake"
      : hour < 12
        ? "Good morning"
        : hour < 18
          ? "Good afternoon"
          : "Good evening";

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0a1120]">
      {/* aurora backdrop */}
      <div
        className="aurora-layer pointer-events-none absolute -right-24 -top-32 h-[38rem] w-[38rem] rounded-full opacity-70 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(34,211,238,0.28), rgba(139,124,246,0.18) 45%, transparent 70%)",
        }}
      />
      <div
        className="aurora-layer pointer-events-none absolute -bottom-40 left-10 h-[30rem] w-[30rem] rounded-full opacity-50 blur-3xl"
        style={{
          animationDelay: "-9s",
          background:
            "radial-gradient(circle at 50% 50%, rgba(245,180,81,0.16), transparent 68%)",
        }}
      />

      {/* globe, bleeding off the right edge */}
      <div className="pointer-events-none absolute inset-y-0 right-[-6%] w-[58%] min-w-[22rem]">
        <Globe />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0a1120] via-[#0a1120]/70 to-transparent" />

      <div
        ref={panelRef}
        className="relative flex flex-col gap-5 px-8 py-12 sm:px-10 md:max-w-2xl md:py-16"
      >
        <div
          data-hero-item
          className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200"
        >
          <Sparkles className="size-3.5" aria-hidden />
          {greeting} — {demoTrip.daysToDeparture} days to {demoTrip.title}
        </div>

        <h1
          data-hero-item
          className="font-serif text-4xl leading-tight tracking-tight text-white sm:text-5xl"
        >
          Where shall we
          <br />
          wander next?
        </h1>

        <p data-hero-item className="max-w-md text-sm text-slate-300/90">
          Just ask. Marco searches flights, stays, and experiences in the
          background and charts the whole route — no forms, no tabs.
        </p>

        <form data-hero-item onSubmit={submit} className="max-w-xl">
          <div className="flex items-center gap-2 rounded-2xl border border-white/12 bg-white/5 p-1.5 backdrop-blur-md focus-within:border-cyan-400/40 focus-within:ring-2 focus-within:ring-cyan-400/15">
            <input
              ref={inputRef}
              className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-white placeholder:text-slate-400 outline-none"
              placeholder="Ask Marco to plan a trip…"
              aria-label="Ask Marco"
            />
            <button
              type="submit"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 px-4 py-2.5 text-sm font-semibold text-[#062230] transition-transform hover:scale-[1.02]"
            >
              Ask Marco
              <ArrowUpRight className="size-4" aria-hidden />
            </button>
          </div>
        </form>

        <div data-hero-item className="flex flex-wrap gap-2">
          {CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => openMarco(router, chip)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-cyan-400/30 hover:bg-cyan-400/5 hover:text-white"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
