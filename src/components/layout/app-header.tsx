"use client";

import Link from "next/link";
import { Compass, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  connected: boolean;
  aiLabel?: string;
  onOpenConnect: () => void;
  onNewTrip: () => void;
}

export function AppHeader({
  connected,
  aiLabel,
  onOpenConnect,
  onNewTrip,
}: AppHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <Link href="/" className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
          <Compass className="size-5" aria-hidden />
        </span>
        <span className="font-serif text-xl font-medium tracking-tight">
          Marco Polo
        </span>
      </Link>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onNewTrip}
          className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-muted sm:px-4"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">New trip</span>
        </button>

        <button
          onClick={onOpenConnect}
          className={cn(
            "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition sm:px-4",
            connected
              ? "bg-primary/10 text-primary"
              : "bg-primary text-primary-foreground hover:bg-primary/90",
          )}
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              connected ? "bg-primary" : "bg-primary-foreground",
            )}
          />
          {connected ? aiLabel ?? "AI connected" : "Connect AI"}
        </button>

        <div className="flex size-9 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
          OB
        </div>
      </div>
    </header>
  );
}
