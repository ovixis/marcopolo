"use client";

import dynamic from "next/dynamic";
import { Compass } from "lucide-react";

import { AskMarco } from "@/components/chat/ask-marco";
import { AnimatedSection } from "@/components/animation/animated-section";

const GlobeScene = dynamic(
  () => import("@/components/scenes/globe-scene").then((m) => m.GlobeScene),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center">
        <div className="size-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    ),
  },
);

export default function Home() {
  return (
    <div className="flex min-h-full flex-col">
      {/* Hero */}
      <section className="mesh-gradient relative overflow-hidden px-6 pb-10 pt-12 lg:px-12 lg:pt-16">
        <div className="mx-auto grid max-w-[1400px] items-center gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <AnimatedSection direction="up" distance={24} className="relative z-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
              <Compass className="size-3.5" aria-hidden />
              Your travel command center
            </div>
            <h1 className="font-serif text-5xl leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              Chart the next voyage.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
              Ask Marco to search live flights, hotels, and experiences — then
              build the itinerary and budget in one elegant place.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#ask-marco"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 btn-press"
              >
                Start planning
              </a>
              <a
                href="/flights"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-base font-medium text-foreground transition hover:bg-muted btn-press"
              >
                Search flights
              </a>
            </div>
          </AnimatedSection>

          <AnimatedSection
            direction="left"
            distance={30}
            delay={0.1}
            className="relative z-10 h-[320px] sm:h-[400px] lg:h-[460px]"
          >
            <div className="gentle-float h-full w-full">
              <GlobeScene />
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Ask Marco surface */}
      <section id="ask-marco" className="flex-1 px-6 pb-10 lg:px-12">
        <div className="mx-auto max-w-[900px]">
          <AskMarco />
        </div>
      </section>
    </div>
  );
}
