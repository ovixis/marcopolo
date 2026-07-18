import Link from "next/link";
import { ArrowRight, CalendarDays, Compass, Users } from "lucide-react";

import { AskMarco } from "@/components/chat/ask-marco";
import { BudgetRing } from "@/components/dashboard/budget-ring";
import { DocsDonut } from "@/components/dashboard/docs-donut";
import { ReadinessList } from "@/components/dashboard/readiness-list";
import { demoTrip } from "@/lib/demo-dashboard";

const card = "rounded-2xl border border-border bg-card shadow-sm";

/**
 * The unified command center: Ask Marco (compact) is the main surface, with a
 * tight column of trip-overview widgets beside it — everything on one screen.
 */
export default function Home() {
  return (
    <div className="flex h-full gap-4 p-4 lg:gap-5 lg:p-6">
      {/* main — Ask Marco */}
      <div className="min-w-0 flex-1">
        <AskMarco />
      </div>

      {/* aside — compact overview (fits one screen) */}
      <aside className="hidden w-80 shrink-0 flex-col gap-4 overflow-y-auto pb-1 xl:flex">
        <section className={`${card} p-4`}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="size-4 text-primary" aria-hidden />
              <span className="font-serif text-lg">{demoTrip.title}</span>
            </div>
            <Link
              href="/itinerary"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Itinerary
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
          <div className="mb-4 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-3.5" aria-hidden />
              {demoTrip.dateRange}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="size-3.5" aria-hidden />
              {demoTrip.travelers} travelers
            </span>
          </div>
          <BudgetRing />
        </section>

        <section className={`${card} p-4`}>
          <h2 className="mb-3 text-sm font-semibold">Trip readiness</h2>
          <ReadinessList />
        </section>

        <section className={`${card} p-4`}>
          <h2 className="mb-3 text-sm font-semibold">Travel documents</h2>
          <DocsDonut />
        </section>
      </aside>
    </div>
  );
}
