"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

import { useReducedMotion } from "./use-reduced-motion";

interface AnimatedSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
  distance?: number;
  duration?: number;
  stagger?: number;
  staggerSelector?: string;
}

export function AnimatedSection({
  children,
  className,
  delay = 0,
  direction = "up",
  distance = 20,
  duration = 0.6,
  stagger = 0.08,
  staggerSelector,
}: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (reduced) {
      gsap.set(el, { opacity: 1, y: 0, x: 0 });
      if (staggerSelector) {
        gsap.set(el.querySelectorAll(staggerSelector), { opacity: 1, y: 0, x: 0 });
      }
      return;
    }

    const axis = direction === "up" || direction === "down" ? "y" : "x";
    const sign = direction === "up" || direction === "left" ? 1 : -1;

    gsap.set(el, { opacity: 0, [axis]: distance * sign });

    const targets = staggerSelector
      ? el.querySelectorAll(staggerSelector)
      : [el];

    const tween = gsap.to(targets, {
      opacity: 1,
      [axis]: 0,
      duration,
      delay,
      stagger: staggerSelector ? stagger : 0,
      ease: "power3.out",
      scrollTrigger: undefined,
      paused: true,
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            tween.play();
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );

    observer.observe(el);

    return () => {
      tween.kill();
      observer.disconnect();
    };
  }, [reduced, delay, direction, distance, duration, stagger, staggerSelector]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
