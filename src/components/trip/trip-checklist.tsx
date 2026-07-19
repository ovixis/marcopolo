"use client";

import {
  Calendar,
  Check,
  Heart,
  MapPin,
  Plane,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface TripDetail {
  key: "whereTo" | "whereFrom" | "who" | "when" | "what";
  label: string;
  value?: string;
  captured: boolean;
}

interface TripChecklistProps {
  details: TripDetail[];
  onGenerate?: () => void;
  canGenerate?: boolean;
}

const ICONS: Record<TripDetail["key"], React.ElementType> = {
  whereTo: MapPin,
  whereFrom: Plane,
  who: Users,
  when: Calendar,
  what: Heart,
};

export function TripChecklist({
  details,
  onGenerate,
  canGenerate,
}: TripChecklistProps) {
  const captured = details.filter((d) => d.captured).length;
  const total = details.length;
  const progress = Math.round((captured / total) * 100);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-6">
        <div className="flex items-center gap-4">
          <div className="relative grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
            <span className="text-sm font-bold">{progress}%</span>
            <svg
              className="absolute inset-0 size-full -rotate-90"
              viewBox="0 0 36 36"
            >
              <path
                className="text-primary/10"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className="text-primary"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${progress}, 100`}
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Trip checklist
            </h3>
            <p className="mt-1 text-xl font-medium">
              {captured === total
                ? "Ready to plan"
                : "Your trip is taking shape"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {captured} of {total} captured
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="space-y-4">
          {details.map((item) => {
            const Icon = ICONS[item.key];
            return (
              <div
                key={item.key}
                className={cn(
                  "rounded-xl border p-4 transition",
                  item.captured
                    ? "border-primary/30 bg-primary/5"
                    : "border-border bg-card",
                )}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-full",
                      item.captured
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {item.captured ? (
                      <Check className="size-4" />
                    ) : (
                      <Icon className="size-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-xs font-semibold uppercase tracking-wide",
                        item.captured
                          ? "text-primary"
                          : "text-muted-foreground",
                      )}
                    >
                      {item.label}
                    </p>
                    {item.captured && item.value ? (
                      <p className="mt-1.5 text-sm font-medium text-foreground">
                        {item.value}
                      </p>
                    ) : (
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Marco will ask when the time is right.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {canGenerate && (
        <div className="border-t border-border p-5">
          <button
            onClick={onGenerate}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"
          >
            <Wallet className="size-4" />
            Generate my trip
          </button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Marco fills anything missing and starts planning.
          </p>
        </div>
      )}
    </div>
  );
}
