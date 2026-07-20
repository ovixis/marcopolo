"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpen,
  CalendarRange,
  Compass,
  Images,
  MessageSquare,
  Plug,
  Wallet,
} from "lucide-react";

import { backendStatus, type BackendStatus } from "@/lib/tauri";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: Compass },
  { href: "/itinerary", label: "Itinerary", icon: CalendarRange },
  { href: "/budget", label: "Budget", icon: Wallet },
  { href: "/photos", label: "Photos", icon: Images },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/agents", label: "Agents", icon: MessageSquare },
  { href: "/connect", label: "Connect", icon: Plug },
];

function StatusDot({ live, label }: { live: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-2 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur-sm">
      <span
        className={cn(
          "size-1.5 rounded-full",
          live ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" : "bg-muted-foreground/50",
        )}
      />
      {label}
    </span>
  );
}

export function AppHeader() {
  const pathname = usePathname();
  const [status, setStatus] = useState<BackendStatus | null>(null);

  useEffect(() => {
    backendStatus().then(setStatus).catch(() => setStatus(null));
  }, []);

  return (
    <header className="glass sticky top-0 z-50 flex h-16 shrink-0 items-center gap-4 px-4 lg:px-6">
      <Link href="/" className="flex shrink-0 items-center gap-2.5">
        <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-b from-[#1a4d52] to-[#0c2f33] shadow-sm ring-1 ring-black/5">
          <Image src="/logo.svg" alt="" width={26} height={26} priority aria-hidden />
        </span>
        <span className="font-serif text-xl tracking-tight sm:text-2xl">Marco Polo</span>
      </Link>

      <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-[15px] font-medium transition-all",
                active
                  ? "bg-primary/10 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <Icon className={cn("size-[18px] transition-colors", active && "text-primary")} aria-hidden />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="hidden shrink-0 items-center gap-2 text-xs text-muted-foreground xl:flex">
        {status ? (
          <>
            <StatusDot live={status.flightsConfigured} label="Flights" />
            <StatusDot live={status.hotelsConfigured} label="Hotels" />
            <span className="opacity-70">v{status.version}</span>
          </>
        ) : (
          <span className="text-muted-foreground">starting…</span>
        )}
      </div>
    </header>
  );
}
