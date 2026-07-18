"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpen,
  CalendarRange,
  Compass,
  Hotel,
  Images,
  MessageSquare,
  Plane,
  Ticket,
  Wallet,
} from "lucide-react";

import { backendStatus, type BackendStatus } from "@/lib/tauri";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/flights", label: "Flights", icon: Plane },
  { href: "/hotels", label: "Hotels", icon: Hotel },
  { href: "/experiences", label: "Experiences", icon: Ticket },
  { href: "/itinerary", label: "Itinerary", icon: CalendarRange },
  { href: "/budget", label: "Budget", icon: Wallet },
  { href: "/photos", label: "Photos", icon: Images },
  { href: "/journal", label: "Journal", icon: BookOpen },
  { href: "/agents", label: "Travel Agents", icon: MessageSquare },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [status, setStatus] = useState<BackendStatus | null>(null);

  useEffect(() => {
    backendStatus().then(setStatus).catch(() => setStatus(null));
  }, []);

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <Link href="/" className="flex items-center gap-2 px-4 py-5">
        <Compass className="size-6 text-primary" aria-hidden />
        <span className="text-lg font-semibold tracking-tight">Marco Polo</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1 px-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t px-4 py-3 text-xs text-muted-foreground">
        {status ? (
          <div className="flex items-center justify-between gap-2">
            <span>v{status.version}</span>
            {status.amadeusConfigured ? (
              <Badge variant="secondary">{status.amadeusEnvironment}</Badge>
            ) : (
              <Badge variant="outline">demo mode</Badge>
            )}
          </div>
        ) : (
          <span>starting…</span>
        )}
      </div>
    </aside>
  );
}
