"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";

import { useReducedMotion } from "@/components/animation/use-reduced-motion";

/**
 * Marco Polo portrait plate. A crisp Floyd–Steinberg-dithered duotone rendered
 * from a public-domain ~1600 portrait. GSAP handles the entrance and a layered
 * "thinking" animation: breathing opacity, a subtle scale pulse, and a ripple
 * ring that expands behind the frame.
 */
export function MarcoFace({
  thinking = false,
  width = 120,
}: {
  thinking?: boolean;
  /** rendered width in px (image is portrait, height follows) */
  width?: number;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    if (reduced) {
      gsap.set(frame, { opacity: 1, scale: 1 });
      return;
    }
    const tween = gsap.from(frame, {
      opacity: 0,
      scale: 0.92,
      duration: 0.7,
      ease: "power3.out",
    });
    return () => {
      tween.kill();
    };
  }, [reduced]);

  useEffect(() => {
    const img = imgRef.current;
    const ring = ringRef.current;
    if (!img) return;

    const ctx = gsap.context(() => {
      if (thinking && !reduced) {
        gsap.to(img, {
          opacity: 0.72,
          scale: 1.03,
          duration: 1.2,
          yoyo: true,
          repeat: -1,
          ease: "sine.inOut",
        });
        if (ring) {
          gsap.fromTo(
            ring,
            { scale: 0.8, opacity: 0.45 },
            {
              scale: 1.5,
              opacity: 0,
              duration: 1.6,
              repeat: -1,
              ease: "power1.out",
            },
          );
        }
      } else {
        gsap.to(img, { opacity: 1, scale: 1, duration: 0.4, ease: "power2.out" });
        if (ring) gsap.set(ring, { scale: 0.8, opacity: 0 });
      }
    });

    return () => {
      ctx.revert();
    };
  }, [thinking, reduced]);

  return (
    <div
      ref={frameRef}
      className="relative shrink-0 overflow-hidden rounded-xl border border-[#c9bfa8] bg-[#efe6d3] p-1 shadow-sm"
      style={{ width }}
    >
      <div
        ref={ringRef}
        className="pointer-events-none absolute inset-0 rounded-xl bg-primary/20"
        aria-hidden
      />
      <div ref={imgRef} className="relative overflow-hidden rounded-lg">
        <Image
          src="/marco-portrait.png"
          alt="Portrait of Marco Polo"
          width={240}
          height={324}
          className="h-auto w-full select-none"
          priority
        />
      </div>
    </div>
  );
}
