"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

import { useReducedMotion } from "./use-reduced-motion";

export function PageTransition({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) {
      gsap.set(el, { opacity: 1, y: 0 });
      return;
    }
    const tween = gsap.from(el, {
      opacity: 0,
      y: 16,
      duration: 0.45,
      ease: "power3.out",
    });
    return () => {
      tween.kill();
    };
  }, [reduced]);

  return (
    <div ref={ref} className={className ?? "min-h-full"}>
      {children}
    </div>
  );
}
