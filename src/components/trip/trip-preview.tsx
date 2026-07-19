"use client";

import { useEffect, useState } from "react";
import {
  Plane,
  Hotel,
  Utensils,
  MapPin,
  Check,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TripPreviewProps {
  title?: string;
  from?: string;
  to?: string;
  travellers?: string;
  dates?: string;
}

const STEPS = [
  { id: "route", label: "Optimizing your route, end to end" },
  { id: "flights", label: "Scanning live flight options" },
  { id: "reviews", label: "Reading hotel and experience reviews" },
  { id: "hotels", label: "Finding the best hotel matches" },
  { id: "plan", label: "Tailoring the plan to you" },
];

export function TripGenerationProgress() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep((s) => (s < STEPS.length - 1 ? s + 1 : s));
    }, 900);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4 p-6">
      <p className="text-base font-medium">Marco is building your trip…</p>
      <div className="space-y-3">
        {STEPS.map((s, index) => {
          const done = index <= step;
          const active = index === step;
          return (
            <div
              key={s.id}
              className={cn(
                "flex items-center gap-3 text-sm transition",
                done ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {done ? (
                active ? (
                  <Loader2 className="size-4 animate-spin text-primary" />
                ) : (
                  <Check className="size-4 text-primary" />
                )
              ) : (
                <span className="size-4 rounded-full border border-muted-foreground/40" />
              )}
              <span className={active ? "font-medium" : ""}>{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TripPreview({
  title = "Your next adventure",
  from = "Home",
  to = "Destination",
  travellers,
  dates,
}: TripPreviewProps) {
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-border p-5">
        <div className="mb-4 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          {dates && <span className="rounded-full bg-secondary px-2 py-1">{dates}</span>}
          {travellers && (
            <span className="rounded-full bg-secondary px-2 py-1">{travellers}</span>
          )}
        </div>
        <h2 className="font-serif text-2xl font-medium leading-tight">{title}</h2>
      </div>

      {/* simple route map */}
      <div className="border-b border-border p-5">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-secondary/50">
          <svg
            className="absolute inset-0 size-full"
            viewBox="0 0 400 300"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity="0.08"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width="400" height="300" fill="url(#grid)" />
            <circle cx="320" cy="220" r="90" fill="currentColor" fillOpacity="0.04" />
            <circle cx="80" cy="80" r="60" fill="currentColor" fillOpacity="0.04" />
            <line
              x1="80"
              y1="80"
              x2="320"
              y2="220"
              stroke="currentColor"
              strokeOpacity="0.25"
              strokeWidth="2"
              strokeDasharray="6 4"
            />
            <circle cx="80" cy="80" r="8" fill="var(--primary)" />
            <circle cx="320" cy="220" r="10" fill="var(--primary)" />
          </svg>
          <div className="absolute left-4 top-4 rounded-lg bg-card/90 px-2 py-1 text-xs font-medium backdrop-blur-sm">
            <MapPin className="mr-1 inline size-3 text-primary" />
            {from}
          </div>
          <div className="absolute bottom-4 right-4 rounded-lg bg-card/90 px-2 py-1 text-xs font-medium backdrop-blur-sm">
            <MapPin className="mr-1 inline size-3 text-primary" />
            {to}
          </div>
        </div>
      </div>

      {/* placeholder cards */}
      <div className="space-y-3 p-5">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
            <Plane className="size-4" />
            Flight
          </div>
          <p className="text-sm text-muted-foreground">
            Marco will search the best route once your AI is connected.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
            <Hotel className="size-4" />
            Stay
          </div>
          <p className="text-sm text-muted-foreground">
            Hotels matched to your style and budget will appear here.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
            <Utensils className="size-4" />
            Experiences
          </div>
          <p className="text-sm text-muted-foreground">
            Restaurants, museums and hidden gems curated by your AI.
          </p>
        </div>
      </div>
    </div>
  );
}
