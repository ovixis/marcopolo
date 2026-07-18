import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarRange,
  Hotel,
  Images,
  MessageSquare,
  Plane,
  Ticket,
  Wallet,
} from "lucide-react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const FEATURES = [
  {
    href: "/flights",
    icon: Plane,
    title: "Flights",
    description: "Search real-time flight offers powered by Amadeus.",
    ready: true,
  },
  {
    href: "/hotels",
    icon: Hotel,
    title: "Hotels",
    description: "Compare stays via Booking.com.",
    ready: false,
  },
  {
    href: "/experiences",
    icon: Ticket,
    title: "Experiences",
    description: "Find tours and activities via Viator.",
    ready: false,
  },
  {
    href: "/itinerary",
    icon: CalendarRange,
    title: "Itinerary",
    description: "Plan each day with drag-and-drop.",
    ready: false,
  },
  {
    href: "/budget",
    icon: Wallet,
    title: "Budget",
    description: "Track costs in real time across categories.",
    ready: false,
  },
  {
    href: "/photos",
    icon: Images,
    title: "Photos",
    description: "Your trip gallery, stored in your own Supabase.",
    ready: false,
  },
  {
    href: "/journal",
    icon: BookOpen,
    title: "AI Journal",
    description: "Claude turns photos and notes into trip stories.",
    ready: false,
  },
  {
    href: "/agents",
    icon: MessageSquare,
    title: "Travel Agents",
    description: "Message a human expert when you want one.",
    ready: false,
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl px-8 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">
          Where to next?
        </h1>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Marco Polo brings flights, stays, experiences, planning, and memories
          into one open-source desktop app.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ href, icon: Icon, title, description, ready }) => (
          <Link key={href} href={href} className="group">
            <Card className="h-full transition-colors group-hover:border-primary/50">
              <CardHeader>
                <div className="mb-1 flex items-center justify-between">
                  <Icon className="size-5 text-primary" aria-hidden />
                  {ready ? (
                    <ArrowRight
                      className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  ) : (
                    <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                      Soon
                    </span>
                  )}
                </div>
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
