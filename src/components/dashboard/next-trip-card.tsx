import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Users } from "lucide-react";

import { demoTrip } from "@/lib/demo-dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** The upcoming trip, front and center. */
export function NextTripCard() {
  return (
    <Card className="overflow-hidden pt-0">
      <div className="relative flex h-36 items-end overflow-hidden bg-gradient-to-br from-[#0B2540] via-[#123B63] to-[#0E7490] px-5 pb-4">
        <Image
          src="/logo.svg"
          alt=""
          width={220}
          height={220}
          className="pointer-events-none absolute -right-10 -top-14 opacity-25"
          aria-hidden
        />
        <div className="relative">
          <p className="text-xs font-medium uppercase tracking-wider text-cyan-200/90">
            Next trip · in {demoTrip.daysToDeparture} days
          </p>
          <h3 className="text-xl font-semibold text-white">{demoTrip.title}</h3>
        </div>
      </div>
      <CardContent className="flex flex-col gap-3 pt-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-4" aria-hidden />
            {demoTrip.dateRange}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="size-4" aria-hidden />
            {demoTrip.travelers} travelers
          </span>
        </div>
        <Button
          variant="secondary"
          className="w-full"
          nativeButton={false}
          render={<Link href="/itinerary" />}
        >
          Open itinerary
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      </CardContent>
    </Card>
  );
}
