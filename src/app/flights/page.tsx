"use client";

import { useMemo, useState } from "react";
import { FlaskConical, Plane, TriangleAlert } from "lucide-react";

import { FlightOfferCard } from "@/components/flights/flight-offer-card";
import { FlightSearchForm } from "@/components/flights/flight-search-form";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { durationToMinutes } from "@/lib/format";
import {
  searchFlights,
  toBackendError,
  type BackendError,
} from "@/lib/tauri";
import type { FlightSearchQuery, FlightSearchResult } from "@/lib/types";

type SortKey = "price" | "duration" | "departure";

function sortOffers(result: FlightSearchResult, sort: SortKey) {
  return [...result.offers].sort((a, b) => {
    switch (sort) {
      case "price":
        return Number(a.totalPrice) - Number(b.totalPrice);
      case "duration":
        return (
          durationToMinutes(a.itineraries[0]?.duration ?? "") -
          durationToMinutes(b.itineraries[0]?.duration ?? "")
        );
      case "departure":
        return (a.itineraries[0]?.segments[0]?.departure.at ?? "").localeCompare(
          b.itineraries[0]?.segments[0]?.departure.at ?? "",
        );
    }
  });
}

export default function FlightsPage() {
  const [result, setResult] = useState<FlightSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<BackendError | null>(null);
  const [sort, setSort] = useState<SortKey>("price");

  const offers = useMemo(
    () => (result ? sortOffers(result, sort) : []),
    [result, sort],
  );

  async function handleSearch(query: FlightSearchQuery) {
    setLoading(true);
    setError(null);
    try {
      setResult(await searchFlights(query));
    } catch (err) {
      setResult(null);
      setError(toBackendError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <div className="mb-6 flex items-center gap-3">
        <Plane className="size-6 text-primary" aria-hidden />
        <h1 className="text-2xl font-semibold tracking-tight">Flights</h1>
      </div>

      <FlightSearchForm loading={loading} onSearch={handleSearch} />

      {result?.demo && (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <FlaskConical className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-500" />
          <p>
            <span className="font-medium">Demo data.</span> No Duffel API key is
            configured, so these offers are locally generated samples. Add{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              DUFFEL_API_KEY
            </code>{" "}
            to your <code className="rounded bg-muted px-1 py-0.5 text-xs">.env</code>{" "}
            to search real flights — free test keys at duffel.com, see the README.
          </p>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p>
            <span className="font-medium">Search failed.</span> {error.message}
          </p>
        </div>
      )}

      {loading && (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-6 w-20" />
              </div>
              <div className="mt-3 flex items-center gap-3">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 flex-1" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && result && (
        <>
          <div className="mb-3 mt-6 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {offers.length} offer{offers.length === 1 ? "" : "s"}
            </p>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="w-44" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price">Cheapest first</SelectItem>
                <SelectItem value="duration">Fastest first</SelectItem>
                <SelectItem value="departure">Earliest departure</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            {offers.map((offer, i) => (
              <div
                key={offer.id}
                className="rise-in"
                style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
              >
                <FlightOfferCard offer={offer} />
              </div>
            ))}
            {offers.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <Plane className="size-6 text-muted-foreground" aria-hidden />
                <p className="text-sm text-muted-foreground">
                  No routes on this date — try nearby airports, or shift a day
                  either way.
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {!loading && !result && !error && (
        <div className="rise-in flex flex-col items-center gap-3 py-16 text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-secondary text-primary">
            <Plane className="size-7" aria-hidden />
          </div>
          <p className="font-serif text-xl text-foreground">Where to first?</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Search a route and I&apos;ll pull live offers — airlines, times and
            prices. Try <span className="font-medium text-foreground">JFK → LHR</span> to explore.
          </p>
        </div>
      )}
    </div>
  );
}
