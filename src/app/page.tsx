import Link from "next/link";
import {
  FlaskConical,
  Globe2,
  PlaneTakeoff,
  Plus,
  Ticket,
  Wallet,
} from "lucide-react";

import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { BookingsTable } from "@/components/dashboard/bookings-table";
import { DocsDonut } from "@/components/dashboard/docs-donut";
import { JournalTeaser } from "@/components/dashboard/journal-teaser";
import { NextTripCard } from "@/components/dashboard/next-trip-card";
import { ReadinessList } from "@/components/dashboard/readiness-list";
import { SpendChart } from "@/components/dashboard/spend-chart";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { demoTrip } from "@/lib/demo-dashboard";

export default function Home() {
  const budgetPct = Math.round(
    (demoTrip.budgetSpent / demoTrip.budgetTotal) * 100,
  );

  return (
    <div className="mx-auto max-w-6xl px-8 py-10">
      {/* ===== Header ===== */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Overview
          </p>
          <h1 className="font-serif text-4xl tracking-tight">
            Your journeys, at a glance
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-medium">
            <FlaskConical className="size-3.5 text-amber-600 dark:text-amber-500" aria-hidden />
            Demo trip
          </span>
          <Button nativeButton={false} render={<Link href="/flights" />}>
            <Plus className="size-4" aria-hidden />
            Plan a trip
          </Button>
        </div>
      </div>

      {/* ===== KPI row ===== */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          hero
          icon={PlaneTakeoff}
          label="Next departure"
          value={`${demoTrip.daysToDeparture} days`}
          note={`${demoTrip.title} · ${demoTrip.dateRange}`}
        />
        <StatCard
          icon={Wallet}
          label="Trip budget used"
          value={`${budgetPct}%`}
          progress={budgetPct}
          note={`$${demoTrip.budgetSpent.toLocaleString()} of $${demoTrip.budgetTotal.toLocaleString()}`}
        />
        <StatCard
          icon={Ticket}
          label="Bookings confirmed"
          value="6 of 8"
          note="2 pending confirmation"
        />
        <StatCard
          icon={Globe2}
          label="Countries visited"
          value="14"
          note="+2 this year"
        />
      </div>

      {/* ===== Main grid ===== */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* left / wide column */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Spending overview</CardTitle>
              <span className="text-xs text-muted-foreground">
                Cumulative · {demoTrip.title}
              </span>
            </CardHeader>
            <CardContent>
              <SpendChart />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Trip readiness</CardTitle>
              </CardHeader>
              <CardContent>
                <ReadinessList />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Travel documents</CardTitle>
              </CardHeader>
              <CardContent>
                <DocsDonut />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Recent bookings</CardTitle>
              <Link
                href="/budget"
                className="text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                View budget →
              </Link>
            </CardHeader>
            <CardContent>
              <BookingsTable />
            </CardContent>
          </Card>
        </div>

        {/* right / narrow column */}
        <div className="flex flex-col gap-6">
          <NextTripCard />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityFeed />
            </CardContent>
          </Card>
          <JournalTeaser />
        </div>
      </div>
    </div>
  );
}
