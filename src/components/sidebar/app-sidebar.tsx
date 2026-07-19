"use client";

import Link from "next/link";
import { Compass, MessageSquare, PenSquare } from "lucide-react";

import { cn } from "@/lib/utils";

interface Trip {
  id: string;
  title: string;
  updatedAt: string;
}

interface AppSidebarProps {
  trips: Trip[];
  activeTripId?: string;
  onNewTrip: () => void;
  onSelectTrip: (id: string) => void;
  connected: boolean;
  aiLabel?: string;
  onOpenConnect: () => void;
}

export function AppSidebar({
  trips,
  activeTripId,
  onNewTrip,
  onSelectTrip,
  connected,
  aiLabel,
  onOpenConnect,
}: AppSidebarProps) {
  return (
    <aside className="sidebar flex h-full w-[260px] shrink-0 flex-col">
      {/* header */}
      <div className="flex h-16 items-center gap-2.5 px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Compass className="size-5" aria-hidden />
          </span>
          <span className="font-serif text-lg font-medium tracking-tight">Marco</span>
        </Link>
      </div>

      {/* new trip */}
      <div className="px-3 pb-3">
        <button
          onClick={onNewTrip}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
        >
          <PenSquare className="size-4" />
          New trip
        </button>
      </div>

      {/* trips */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {trips.length > 0 && (
          <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Recent trips
          </div>
        )}
        <div className="space-y-1">
          {trips.map((trip) => (
            <button
              key={trip.id}
              onClick={() => onSelectTrip(trip.id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition",
                activeTripId === trip.id
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <MessageSquare className="size-4 shrink-0" />
              <span className="truncate">{trip.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* footer */}
      <div className="border-t border-sidebar-border p-3">
        <button
          onClick={onOpenConnect}
          className={cn(
            "mb-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium transition",
            connected
              ? "bg-primary/10 text-primary"
              : "bg-card text-foreground hover:bg-muted",
          )}
        >
          <span
            className={cn(
              "size-2 rounded-full",
              connected ? "bg-primary" : "bg-muted-foreground",
            )}
          />
          <span className="truncate">
            {connected ? aiLabel ?? "AI connected" : "Connect your AI"}
          </span>
        </button>

      </div>
    </aside>
  );
}
