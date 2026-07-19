"use client";

import dynamic from "next/dynamic";

import { AskMarco } from "@/components/chat/ask-marco";
import { AnimatedSection } from "@/components/animation/animated-section";

const GlobeScene = dynamic(
  () => import("@/components/scenes/globe-scene").then((m) => m.GlobeScene),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse rounded-3xl bg-muted/40" /> },
);

export default function Home() {
  return (
    <div className="flex min-h-full flex-col">
      {/* Hero */}
      <section className="mesh-gradient relative overflow-hidden px-6 pb-8 pt-10 lg:px-10 lg:pt-14">
        <div className="mx-auto grid max-w-[1400px] items-center gap-8 lg:grid-cols-[1fr_1.15fr] lg:gap-12">
          <AnimatedSection direction="up" distance={24} className="relative z-10">
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-primary/80">
              Your travel command center
            </p>
            <h1 className="font-serif text-4xl leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Chart the next voyage.
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
              Ask Marco to search live flights, hotels, and experiences — then
              build the itinerary and budget in one place.
            </p>
          </AnimatedSection>

          <AnimatedSection
            direction="left"
            distance={30}
            delay={0.1}
            className="relative z-10 h-[320px] sm:h-[380px] lg:h-[420px]"
          >
            <GlobeScene />
          </AnimatedSection>
        </div>
      </section>

      {/* Ask Marco surface */}
      <section className="flex-1 px-6 pb-8 lg:px-10">
        <div className="mx-auto max-w-[1400px]">
          <AskMarco />
        </div>
      </section>
    </div>
  );
}
