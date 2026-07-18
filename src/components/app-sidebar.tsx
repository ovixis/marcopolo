"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpen,
  CalendarRange,
  Images,
  LayoutGrid,
  MessageSquare,
  Plug,
  Sparkles,
  Wallet,
} from "lucide-react";

import { backendStatus, type BackendStatus } from "@/lib/tauri";
import { cn } from "@/lib/utils";

// Flights, hotels, and experiences intentionally have no menu entry — they run
// as background actions inside Ask Marco. Everything the traveler still touches
// directly stays here.
const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutGrid },
  { href: "/itinerary", label: "Itinerary", icon: CalendarRange },
  { href: "/budget", label: "Budget", icon: Wallet },
  { href: "/photos", label: "Photos", icon: Images },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/agents", label: "Travel Agents", icon: MessageSquare },
  { href: "/connect", label: "AI Connect", icon: Plug },
];

function StatusChip({ label, live, env }: { label: string; live: boolean; env: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-2 py-0.5">
      <span
        className={cn(
          "size-1.5 rounded-full",
          live ? "bg-emerald-400" : "bg-slate-500",
        )}
      />
      {label} {live ? env : "demo"}
    </span>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const [status, setStatus] = useState<BackendStatus | null>(null);

  useEffect(() => {
    backendStatus().then(setStatus).catch(() => setStatus(null));
  }, []);

  const chatActive = pathname === "/chat" || pathname.startsWith("/chat/");

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-white/8 bg-sidebar text-sidebar-foreground">
      <Link href="/" className="flex items-center gap-2.5 px-5 py-5">
        <Image
          src="/logo.svg"
          alt=""
          width={30}
          height={30}
          className="rounded-md"
          aria-hidden
        />
        <span className="text-lg font-semibold tracking-tight">Marco Polo</span>
      </Link>

      {/* Ask Marco — the primary command surface */}
      <div className="px-3">
        <Link
          href="/chat"
          className={cn(
            "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
            chatActive
              ? "border-cyan-400/40 bg-cyan-400/10"
              : "border-white/10 bg-gradient-to-r from-cyan-400/10 to-violet-400/10 hover:border-cyan-400/30",
          )}
        >
          <span className="rounded-lg bg-gradient-to-br from-cyan-400 to-sky-500 p-1.5 text-[#062230]">
            <Sparkles className="size-4" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-white">Ask Marco</span>
            <span className="block truncate text-[11px] text-slate-400">
              flights · stays · plans
            </span>
          </span>
        </Link>
      </div>

      <div className="mx-5 my-3 border-t border-white/8" />

      <nav className="flex flex-1 flex-col gap-1 px-3">
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
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-white/[0.06] text-white"
                  : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
              )}
            >
              <Icon
                className={cn("size-4", active && "text-primary")}
                aria-hidden
              />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-2 border-t border-white/8 px-4 py-3 text-[11px] text-muted-foreground">
        {status ? (
          <>
            <div className="flex flex-wrap gap-1.5">
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
            </div>
            <span className="text-slate-500">v{status.version}</span>
          </>
        ) : (
          <span>starting…</span>
        )}
      </div>
    </aside>
  );
}
