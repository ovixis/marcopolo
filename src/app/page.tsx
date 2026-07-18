import Link from "next/link";
import { ArrowRight, CalendarDays, Compass, Users } from "lucide-react";

import { AskMarco } from "@/components/chat/ask-marco";
import { BudgetRing } from "@/components/dashboard/budget-ring";
import { DocsDonut } from "@/components/dashboard/docs-donut";
import { ReadinessList } from "@/components/dashboard/readiness-list";
import { demoTrip } from "@/lib/demo-dashboard";

const card = "rounded-2xl border border-border bg-card shadow-sm";

/**
 * The unified command center: Ask Marco is the main surface, with a column of
 * trip-overview widgets beside it. Full-width now the sidebar is gone.
 */
export default function Home() {
  return (
    <div className="mx-auto flex h-full max-w-[1680px] gap-6 p-6 lg:gap-8 lg:p-8">
      {/* main — Ask Marco */}
      <div className="min-w-0 flex-1">
        <AskMarco />
      </div>

      {/* aside — trip overview */}
      <aside className="hidden w-[26rem] shrink-0 flex-col gap-6 overflow-y-auto pb-2 xl:flex">
        <section className={`${card} p-6`}>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Compass className="size-6 text-primary" aria-hidden />
              <span className="font-serif text-2xl">{demoTrip.title}</span>
            </div>
            <Link
              href="/itinerary"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Itinerary
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <div className="mb-5 flex items-center gap-5 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <CalendarDays className="size-4" aria-hidden />
              {demoTrip.dateRange}
            </span>
            <span className="flex items-center gap-2">
              <Users className="size-4" aria-hidden />
              {demoTrip.travelers} travelers
            </span>
          </div>
          <BudgetRing />
        </section>

        <section className={`${card} p-6`}>
          <h2 className="mb-4 text-base font-semibold">Trip readiness</h2>
          <ReadinessList />
        </section>

        <section className={`${card} p-6`}>
          <h2 className="mb-4 text-base font-semibold">Travel documents</h2>
          <DocsDonut />
        </section>
      </aside>
    </div>
  );
}
