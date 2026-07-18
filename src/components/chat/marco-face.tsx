"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

import { MARCO_ASCII } from "./marco-ascii";

/**
 * Marco Polo as an ASCII portrait plate — luminance-ramped from a public-domain
 * ~1600 portrait (see marco-ascii.ts for the source + license), rendered
 * light-on-dark like a sepia daguerreotype in an explorer's journal. GSAP fades
 * it in and pulses it while Marco is "thinking".
 */
export function MarcoFace({
  thinking = false,
  size = 4.6,
}: {
  thinking?: boolean;
  /** monospace font-size in px — controls the plate's overall scale */
  size?: number;
}) {
  const plateRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<HTMLDivElement>(null);
  const pulseRef = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    const plate = plateRef.current;
    if (!plate) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.set(plate, { opacity: 1, scale: 1 });
      return;
    }
    const tween = gsap.from(plate, {
      opacity: 0,
      scale: 0.94,
      duration: 0.7,
      ease: "power3.out",
    });
    return () => {
      tween.kill();
    };
  }, []);

  useEffect(() => {
    const art = artRef.current;
    if (!art) return;
    pulseRef.current?.kill();
    if (thinking && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      pulseRef.current = gsap.to(art, {
        opacity: 0.55,
        duration: 0.7,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });
    } else {
      pulseRef.current = gsap.to(art, { opacity: 1, duration: 0.4 });
    }
    return () => {
      pulseRef.current?.kill();
    };
  }, [thinking]);

  return (
    <div
      ref={plateRef}
      className="relative overflow-hidden rounded-lg"
      style={{ background: "#221a11", padding: "10px 12px" }}
      role="img"
      aria-label="ASCII portrait of Marco Polo"
    >
      {/* warm vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          boxShadow: "inset 0 0 26px rgba(0,0,0,0.55)",
          background:
            "radial-gradient(ellipse at 50% 38%, rgba(232,214,166,0.06), transparent 70%)",
        }}
      />
      <div
        ref={artRef}
        className="relative select-none"
        style={{
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: `${size}px`,
          lineHeight: `${size}px`,
          fontWeight: 700,
          color: "#e8d6a6",
          letterSpacing: "0.5px",
        }}
      >
        {MARCO_ASCII.map((line, i) => (
          <pre key={i} className="m-0 whitespace-pre">
            {line || " "}
          </pre>
        ))}
      </div>
    </div>
  );
}
