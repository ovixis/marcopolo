"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";

/**
 * Marco Polo portrait plate. A crisp Floyd–Steinberg-dithered duotone rendered
 * from a public-domain ~1600 portrait (commons.wikimedia.org/wiki/
 * File:Marco_Polo_portrait.jpg, Public Domain Mark 1.0) — a sepia "journal
 * plate" look. GSAP fades it in and pulses it while Marco is thinking.
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
  const pulseRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(frame, { opacity: 1, scale: 1 });
      return;
    }
    const tween = gsap.from(frame, {
      opacity: 0,
      scale: 0.94,
      duration: 0.6,
      ease: "power3.out",
    });
    return () => {
      tween.kill();
    };
  }, []);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    pulseRef.current?.kill();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    pulseRef.current =
      thinking && !reduce
        ? gsap.to(img, {
            opacity: 0.6,
            duration: 0.7,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut",
          })
        : gsap.to(img, { opacity: 1, duration: 0.4 });
    return () => {
      pulseRef.current?.kill();
    };
  }, [thinking]);

  return (
    <div
      ref={frameRef}
      className="shrink-0 overflow-hidden rounded-lg border border-[#c9bfa8] bg-[#efe6d3] p-1 shadow-sm"
      style={{ width }}
    >
      <div ref={imgRef} className="overflow-hidden rounded">
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
