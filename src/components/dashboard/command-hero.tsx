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
    // Content is visible by default; only animate as an enhancement. If motion
    // is reduced (or GSAP can't run), the hero never ends up hidden.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(items, { opacity: 1, y: 0 });
      return;
    }
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
    <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-[#f1eadb] via-[#eae2d6] to-[#e6e7d6] shadow-sm">
      {/* soft nature glows */}
      <div
        className="aurora-layer pointer-events-none absolute -right-24 -top-32 h-[38rem] w-[38rem] rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(156,175,136,0.24), rgba(85,105,47,0.16) 45%, transparent 70%)",
        }}
      />
      <div
        className="aurora-layer pointer-events-none absolute -bottom-40 left-10 h-[30rem] w-[30rem] rounded-full opacity-50 blur-3xl"
        style={{
          animationDelay: "-9s",
          background:
            "radial-gradient(circle at 50% 50%, rgba(214,197,142,0.26), transparent 68%)",
        }}
      />

      {/* globe, bleeding off the right edge */}
      <div className="pointer-events-none absolute inset-y-0 right-[-6%] w-[58%] min-w-[22rem]">
        <Globe />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#eae2d6] via-[#eae2d6]/75 to-transparent" />

      <div
        ref={panelRef}
        className="relative flex flex-col gap-5 px-8 py-12 sm:px-10 md:max-w-2xl md:py-16"
      >
        <div
          data-hero-item
          className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
        >
          <Sparkles className="size-3.5" aria-hidden />
          {greeting} — {demoTrip.daysToDeparture} days to {demoTrip.title}
        </div>

        <h1
          data-hero-item
          className="font-serif text-4xl leading-tight tracking-tight text-foreground sm:text-5xl"
        >
          Where shall we
          <br />
          wander next?
        </h1>

        <p data-hero-item className="max-w-md text-sm text-muted-foreground">
          Just ask. Marco searches flights, stays, and experiences in the
          background and charts the whole route — no forms, no tabs.
        </p>

        <form data-hero-item onSubmit={submit} className="max-w-xl">
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-card/80 p-1.5 shadow-sm backdrop-blur-sm focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
            <input
              ref={inputRef}
              className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none"
              placeholder="Ask Marco to plan a trip…"
              aria-label="Ask Marco"
            />
            <button
              type="submit"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#55692f] to-[#4a5b29] px-4 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
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
              className="rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
