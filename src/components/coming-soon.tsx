"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

import { useReducedMotion } from "@/components/animation/use-reduced-motion";

interface ComingSoonProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  /** Roadmap window, e.g. "Weeks 5-8". */
  phase: string;
  /** What this feature will include when it ships. */
  planned: string[];
  /** Optional Marco-voice lead-in under the title. */
  leadIn?: string;
}

export function ComingSoon({
  icon,
  title,
  description,
  phase,
  planned,
  leadIn,
}: ComingSoonProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    const items = el.querySelectorAll("[data-animate]");
    gsap.fromTo(
      items,
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.07, ease: "power2.out" },
    );
  }, [reduced]);

  return (
    <div
      ref={ref}
      className="mx-auto flex max-w-2xl flex-col items-center px-6 py-16 text-center"
    >
      <div data-animate className="flex flex-col items-center gap-3">
        <div className="grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary shadow-sm">
          {icon}
        </div>
        <span className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
          Roadmap · {phase}
        </span>
        <h1 className="font-serif text-3xl text-foreground sm:text-4xl">
          {leadIn ?? title}
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>

      <div
        data-animate
        className="mt-10 w-full rounded-3xl border border-border bg-card p-7 text-left shadow-sm"
      >
        <p className="mb-4 text-sm font-medium text-foreground">
          Charted for this feature
        </p>
        <ul className="space-y-3">
          {planned.map((item) => (
            <li
              key={item}
              data-animate
              className="flex items-start gap-3 text-sm text-muted-foreground"
            >
              <span
                className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/70"
                aria-hidden
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p data-animate className="mt-6 text-sm text-muted-foreground">
          Want to help build it? Check{" "}
          <a
            href="https://github.com/ovixis/marcopolo/blob/main/CONTRIBUTING.md"
            className="font-medium text-foreground underline underline-offset-4"
            target="_blank"
            rel="noopener noreferrer"
          >
            CONTRIBUTING.md
          </a>{" "}
          — issues for this feature are tagged and open.
        </p>
      </div>
    </div>
  );
}
