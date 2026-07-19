"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

import { globeCities, globeRoutes } from "@/lib/demo-dashboard";
import { useReducedMotion } from "@/components/animation/use-reduced-motion";

function project(lat: number, lng: number, radius: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  // Simple orthographic projection: use x and y, scale by sphere curvature
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const visible = z >= -radius * 0.25;
  const scale = (radius * 0.9 + z * 0.35) / radius;
  return [x * scale + 200, y * scale + 200, visible ? 1 : 0];
}

export function GlobeFallback() {
  const svgRef = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || !svgRef.current) return;
    const routes = svgRef.current.querySelectorAll(".route-arc");
    const cities = svgRef.current.querySelectorAll(".city-marker");
    gsap.fromTo(
      routes,
      { strokeDashoffset: 1000 },
      { strokeDashoffset: 0, duration: 1.8, stagger: 0.2, ease: "power2.out" },
    );
    gsap.fromTo(
      cities,
      { opacity: 0, scale: 0 },
      { opacity: 1, scale: 1, duration: 0.5, stagger: 0.04, ease: "back.out(1.7)", delay: 0.6 },
    );
  }, [reduced]);

  const radius = 160;

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 400 400"
      className="h-full w-full"
      aria-label="Stylized world map showing Marco Polo routes"
    >
      <defs>
        <radialGradient id="sphere" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="var(--brand-sage)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--brand-sage)" stopOpacity="0" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle cx="200" cy="200" r={radius} fill="url(#sphere)" opacity="0.5" />
      <circle
        cx="200"
        cy="200"
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.15"
      />

      {globeRoutes.map((route, i) => {
        const [x1, y1] = project(route.from[0], route.from[1], radius);
        const [x2, y2] = project(route.to[0], route.to[1], radius);
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2 - 30;
        return (
          <path
            key={i}
            d={`M${x1},${y1} Q${mx},${my} ${x2},${y2}`}
            fill="none"
            stroke={route.active ? "var(--brand-sky)" : "var(--brand-walnut)"}
            strokeWidth={route.active ? 3 : 1.5}
            strokeLinecap="round"
            strokeDasharray="1000"
            strokeDashoffset="0"
            opacity={route.active ? 0.9 : 0.4}
            className={`route-arc ${route.active ? "route-pulse" : ""}`}
          />
        );
      })}

      {globeCities.map(([lat, lng], i) => {
        const [x, y, visible] = project(lat, lng, radius);
        if (!visible) return null;
        return (
          <g key={i} className="city-marker" transform={`translate(${x},${y})`}>
            <circle r="4" fill="var(--brand-terracotta)" filter="url(#glow)" />
            <circle r="8" fill="none" stroke="var(--brand-terracotta)" strokeWidth="1" opacity="0.35" />
          </g>
        );
      })}
    </svg>
  );
}
