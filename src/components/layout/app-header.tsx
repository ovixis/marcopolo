"use client";

import Image from "next/image";
import Link from "next/link";
import { Moon, Plus, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppState } from "./app-shell";

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
  const { theme, toggleTheme } = useAppState();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <Link href="/" className="group flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center overflow-hidden rounded-xl bg-primary/10 ring-1 ring-primary/20 shadow-sm shadow-primary/10 transition group-hover:shadow-primary/20">
          <Image
            src="/logo.svg"
            alt="Marco Polo logo"
            width={36}
            height={36}
            priority
            className="size-full object-contain"
          />
        </span>
        <span className="font-serif text-xl font-medium tracking-tight">
          Marco Polo
        </span>
      </Link>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onNewTrip}
          className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition hover:border-primary/30 hover:bg-muted sm:px-4"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">New trip</span>
        </button>

        <button
          onClick={onOpenConnect}
          className={cn(
            "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition sm:px-4",
            connected
              ? "border border-primary/20 bg-primary/10 text-primary hover:bg-primary/15"
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

        <button
          onClick={toggleTheme}
          className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </button>

        <div className="flex size-9 items-center justify-center rounded-full border border-border bg-secondary text-sm font-semibold text-secondary-foreground">
          OB
        </div>
      </div>
    </header>
  );
}
