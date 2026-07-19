"use client";

import Link from "next/link";
import {
  Briefcase,
  CalendarRange,
  Compass,
  Images,
  MessageSquare,
  Moon,
  PenSquare,
  Plane,
  Plug,
  Sun,
  Wallet,
} from "lucide-react";

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
  darkMode: boolean;
  onToggleTheme: () => void;
}

const TOOLS = [
  { href: "/flights", label: "Flights", icon: Plane },
  { href: "/hotels", label: "Hotels", icon: Briefcase },
  { href: "/itinerary", label: "Itinerary", icon: CalendarRange },
  { href: "/budget", label: "Budget", icon: Wallet },
  { href: "/photos", label: "Photos", icon: Images },
  { href: "/journal", label: "Journal", icon: PenSquare },
  { href: "/agents", label: "Agents", icon: MessageSquare },
  { href: "/connect", label: "Connect", icon: Plug },
];

export function AppSidebar({
  trips,
  activeTripId,
  onNewTrip,
  onSelectTrip,
  connected,
  aiLabel,
  onOpenConnect,
  darkMode,
  onToggleTheme,
}: AppSidebarProps) {
  return (
    <aside className="sidebar flex h-full w-[260px] shrink-0 flex-col">
      {/* header */}
      <div className="flex h-14 items-center gap-2.5 px-3">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Compass className="size-5" aria-hidden />
          </span>
          <span className="font-serif text-lg font-medium">Marco Polo</span>
        </Link>
      </div>

      {/* new trip */}
      <div className="px-3 pb-2">
        <button
          onClick={onNewTrip}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
        >
          <PenSquare className="size-4" />
          New trip
        </button>
      </div>

      {/* trips */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {trips.length > 0 && (
          <div className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
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

        <div className="mt-6 mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Tools
        </div>
        <div className="space-y-1">
          {TOOLS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* footer */}
      <div className="border-t border-sidebar-border p-3">
        <button
          onClick={onOpenConnect}
          className={cn(
            "mb-3 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition",
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
          <span className="truncate">{connected ? aiLabel ?? "AI connected" : "Connect AI"}</span>
        </button>

        <button
          onClick={onToggleTheme}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
          {darkMode ? "Light mode" : "Dark mode"}
        </button>
      </div>
    </aside>
  );
}
