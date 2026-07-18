import Link from "next/link";
import { ArrowRight, CalendarRange, Compass, Users } from "lucide-react";

import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { BudgetRing } from "@/components/dashboard/budget-ring";
import { CapabilityRail } from "@/components/dashboard/capability-rail";
import { CommandHero } from "@/components/dashboard/command-hero";
import { DocsDonut } from "@/components/dashboard/docs-donut";
import { JournalTeaser } from "@/components/dashboard/journal-teaser";
import { ReadinessList } from "@/components/dashboard/readiness-list";
import { SpendChart } from "@/components/dashboard/spend-chart";
import { demoTrip } from "@/lib/demo-dashboard";

const panel =
  "rounded-2xl border border-white/8 bg-white/[0.02] p-5 backdrop-blur-sm";

function PanelHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      {action}
    </div>
  );
}

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8 lg:px-8">
      <CommandHero />

      {/* ===== bento: trip · capabilities · documents ===== */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-6">
        <section className={`${panel} lg:col-span-2`}>
          <PanelHeader
            title="Next voyage"
            action={
              <Link
                href="/itinerary"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Itinerary
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            }
          />
          <div className="mb-4 flex items-center gap-2">
            <Compass className="size-4 text-primary" aria-hidden />
            <span className="text-lg font-semibold">{demoTrip.title}</span>
          </div>
          <div className="mb-4 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarRange className="size-3.5" aria-hidden />
              {demoTrip.dateRange}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="size-3.5" aria-hidden />
              {demoTrip.travelers} travelers
            </span>
          </div>
          <BudgetRing />
        </section>

        <section className={`${panel} lg:col-span-2`}>
          <PanelHeader title="Ask Marco" />
          <CapabilityRail />
        </section>

        <section className={`${panel} lg:col-span-2`}>
          <PanelHeader title="Travel documents" />
          <DocsDonut />
        </section>
      </div>

      {/* ===== bento: spending · readiness ===== */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-6">
        <section className={`${panel} lg:col-span-4`}>
          <PanelHeader
            title="Spending overview"
            action={
              <span className="text-xs text-muted-foreground">
                Cumulative · {demoTrip.title}
              </span>
            }
          />
          <SpendChart />
        </section>

        <section className={`${panel} lg:col-span-2`}>
          <PanelHeader title="Trip readiness" />
          <ReadinessList />
        </section>
      </div>

      {/* ===== bento: activity · journal ===== */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-6">
        <section className={`${panel} lg:col-span-3`}>
          <PanelHeader title="Recent activity" />
          <ActivityFeed />
        </section>
        <div className="lg:col-span-3">
          <JournalTeaser />
        </div>
      </div>
    </div>
  );
}
