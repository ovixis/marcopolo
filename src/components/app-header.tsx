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

// The home ("/") is the unified command center — Ask Marco + the trip overview.
// Flights, hotels, and experiences run as background actions inside the chat,
// so they have no menu entry; only what the traveler touches directly stays.
const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: Compass },
  { href: "/itinerary", label: "Itinerary", icon: CalendarRange },
  { href: "/budget", label: "Budget", icon: Wallet },
  { href: "/photos", label: "Photos", icon: Images },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/agents", label: "Agents", icon: MessageSquare },
  { href: "/connect", label: "Connect", icon: Plug },
];

function StatusChip({ label, live, env }: { label: string; live: boolean; env: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1">
      <span
        className={cn(
          "size-2 rounded-full",
          live ? "bg-primary" : "bg-muted-foreground/50",
        )}
      />
      {label} {live ? env : "demo"}
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
    <header className="flex h-16 shrink-0 items-center gap-6 border-b border-sidebar-border bg-sidebar px-5 text-sidebar-foreground lg:px-7">
      <Link href="/" className="flex shrink-0 items-center gap-2.5">
        <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-b from-[#175058] to-[#0b2e34] shadow-sm ring-1 ring-black/5">
          <Image src="/logo.svg" alt="" width={26} height={26} priority aria-hidden />
        </span>
        <span className="font-serif text-2xl tracking-tight">Marco Polo</span>
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
                "flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-[15px] font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              <Icon
                className={cn("size-[18px]", active && "text-primary")}
                aria-hidden
              />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="hidden shrink-0 items-center gap-2 text-xs text-muted-foreground lg:flex">
        {status ? (
          <>
            <StatusChip
              label="Flights"
              live={status.flightsConfigured}
              env={status.environment}
            />
            <StatusChip
              label="Hotels"
              live={status.hotelsConfigured}
              env={status.hotelsEnvironment}
            />
            <span className="opacity-70">v{status.version}</span>
          </>
        ) : (
          <span>starting…</span>
        )}
      </div>
    </header>
  );
}
