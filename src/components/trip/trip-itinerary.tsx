"use client";

import { useEffect, useRef } from "react";
import {
  Bed,
  Bus,
  Calendar,
  Clock,
  Download,
  MapPin,
  Star,
  Utensils,
  Wallet,
} from "lucide-react";
import gsap from "gsap";

import { TripHeroScene } from "./trip-hero-scene";
import { useReducedMotion } from "@/components/animation/use-reduced-motion";

interface TripItineraryProps {
  title?: string;
  from?: string;
  to?: string;
  travellers?: string;
  dates?: string;
}

const DAYS = [
  {
    day: 1,
    title: "Arrival & first tastes",
    items: [
      { icon: MapPin, label: "Check-in", text: "Settle into your centrally located stay" },
      { icon: Utensils, label: "Lunch", text: "Local bistro picked by your AI" },
      { icon: Star, label: "Experience", text: "Walking tour of the historic core" },
    ],
  },
  {
    day: 2,
    title: "Culture & hidden gems",
    items: [
      { icon: Star, label: "Museum", text: "Skip-the-line visit to a top collection" },
      { icon: Utensils, label: "Dinner", text: "Reservation at a curated restaurant" },
      { icon: MapPin, label: "Evening", text: "Sunset spot with the best city views" },
    ],
  },
];

function Metric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="metric-item flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-sm backdrop-blur-sm">
      <Icon className="size-4 text-primary" />
      <span>
        <span className="font-semibold text-foreground">{value}</span>{" "}
        <span className="text-muted-foreground">{label}</span>
      </span>
    </div>
  );
}

export function TripItinerary({
  title = "Your next adventure",
  from = "Home",
  to = "Destination",
  travellers,
  dates,
}: TripItineraryProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".itinerary-section",
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, duration: 0.55, stagger: 0.1, ease: "power3.out" },
      );
      gsap.fromTo(
        ".metric-item",
        { opacity: 0, scale: 0.92 },
        { opacity: 1, scale: 1, duration: 0.4, stagger: 0.05, ease: "back.out(1.7)", delay: 0.2 },
      );
    }, panelRef);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <div ref={panelRef} className="flex h-full flex-col overflow-y-auto">
      {/* hero card */}
      <div className="itinerary-section relative border-b border-border">
        <TripHeroScene destination={to} className="absolute inset-0" />
        <div className="relative flex aspect-[16/9] flex-col justify-end p-5">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-xs font-medium text-white/80 backdrop-blur-md">
              <MapPin className="size-3" />
              {to}
            </span>
            <h2 className="mt-2 font-serif text-3xl font-medium leading-tight text-white sm:text-4xl">
              {title}
            </h2>
          </div>
        </div>
      </div>

      {/* metrics */}
      <div className="itinerary-section border-b border-border p-5">
        <div className="flex flex-wrap gap-2">
          <Metric icon={Calendar} label="days" value="2" />
          <Metric icon={MapPin} label="city" value="1" />
          <Metric icon={Star} label="experiences" value="6" />
          <Metric icon={Bed} label="hotel" value="1" />
          <Metric icon={Bus} label="transports" value="2" />
        </div>
      </div>

      {/* route map */}
      <div className="itinerary-section border-b border-border p-5">
        <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-border bg-card/50">
          <svg
            className="absolute inset-0 size-full"
            viewBox="0 0 400 220"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              <pattern id="it-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path
                  d="M 32 0 L 0 0 0 32"
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity="0.06"
                  strokeWidth="1"
                />
              </pattern>
              <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#19c59f" />
                <stop offset="100%" stopColor="#f5d78e" />
              </linearGradient>
            </defs>
            <rect width="400" height="220" fill="url(#it-grid)" />
            <circle cx="110" cy="75" r="55" fill="url(#routeGradient)" fillOpacity="0.04" />
            <circle cx="290" cy="145" r="75" fill="url(#routeGradient)" fillOpacity="0.04" />
            <line
              x1="110"
              y1="75"
              x2="290"
              y2="145"
              stroke="url(#routeGradient)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="8 6"
              className="route-dash"
            />
            <circle cx="110" cy="75" r="6" fill="#19c59f" />
            <circle cx="290" cy="145" r="8" fill="#f5d78e" />
            <circle cx="290" cy="145" r="8" fill="#f5d78e" fillOpacity="0.3" className="marker-pulse" />
          </svg>
          <div className="absolute left-3 top-3 rounded-lg bg-card/90 px-2.5 py-1 text-xs font-medium backdrop-blur-sm">
            {from}
          </div>
          <div className="absolute bottom-3 right-3 rounded-lg bg-card/90 px-2.5 py-1 text-xs font-medium backdrop-blur-sm">
            {to}
          </div>
        </div>
      </div>

      {/* daily timeline */}
      <div className="itinerary-section border-b border-border p-5">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Itinerary
        </h3>
        <div className="relative space-y-6 pl-6">
          <div className="absolute left-[9px] top-2 bottom-2 w-px bg-gradient-to-b from-primary/50 via-border to-transparent" />
          {DAYS.map((day) => (
            <div key={day.day} className="relative">
              <div className="absolute -left-6 top-0.5 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {day.day}
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Day {day.day}
              </p>
              <h4 className="font-medium">{day.title}</h4>
              <div className="mt-2 space-y-2">
                {day.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 rounded-xl border border-border bg-card/40 p-2.5"
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-secondary">
                      <item.icon className="size-3.5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                      <p className="text-sm">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* transport card */}
      <div className="itinerary-section border-b border-border p-5">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
          <div className="absolute -right-8 -top-8 size-32 rounded-full bg-primary/5 blur-2xl" />
          <div className="relative p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                Transport
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="size-3" />
                2h 15m
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-center">
                <p className="text-xl font-medium">{from}</p>
                <p className="text-xs text-muted-foreground">Aug 25</p>
              </div>
              <div className="flex flex-1 flex-col items-center px-4">
                <div className="relative h-0.5 w-full bg-border">
                  <div className="absolute left-0 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-primary" />
                  <div className="absolute right-0 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-accent" />
                  <div className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-background" />
                </div>
                <Bus className="mt-2 size-4 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-xl font-medium">{to}</p>
                <p className="text-xs text-muted-foreground">Aug 25</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* price + actions */}
      <div className="itinerary-section mt-auto p-5">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Estimated total</p>
            <p className="text-3xl font-medium text-gradient">€444</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {travellers ?? "2 travellers"} · {dates ?? "Aug 25–27"}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium transition hover:bg-muted">
            <Download className="size-4" />
            Download
          </button>
          <button className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">
            <Wallet className="size-4" />
            Book
          </button>
        </div>
      </div>
    </div>
  );
}
