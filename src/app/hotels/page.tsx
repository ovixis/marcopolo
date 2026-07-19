"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FlaskConical, Hotel, TriangleAlert } from "lucide-react";
import gsap from "gsap";

import { HotelOfferCard } from "@/components/hotels/hotel-offer-card";
import { HotelSearchForm } from "@/components/hotels/hotel-search-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedSection } from "@/components/animation/animated-section";
import { useReducedMotion } from "@/components/animation/use-reduced-motion";
import {
  searchHotels,
  toBackendError,
  type BackendError,
} from "@/lib/tauri";
import type { HotelSearchQuery, HotelSearchResult } from "@/lib/types";

type SortKey = "price" | "score" | "stars";

function sortOffers(result: HotelSearchResult, sort: SortKey) {
  return [...result.offers].sort((a, b) => {
    switch (sort) {
      case "price":
        return Number(a.totalPrice) - Number(b.totalPrice);
      case "score":
        return (b.reviewScore ?? 0) - (a.reviewScore ?? 0);
      case "stars":
        return (b.starRating ?? 0) - (a.starRating ?? 0);
    }
  });
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const inDate = new Date(`${checkIn}T00:00:00`);
  const outDate = new Date(`${checkOut}T00:00:00`);
  const diff = Math.round((outDate.getTime() - inDate.getTime()) / 86_400_000);
  return diff > 0 ? diff : 1;
}

export default function HotelsPage() {
  const [result, setResult] = useState<HotelSearchResult | null>(null);
  const [nights, setNights] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<BackendError | null>(null);
  const [sort, setSort] = useState<SortKey>("price");
  const listRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const offers = useMemo(
    () => (result ? sortOffers(result, sort) : []),
    [result, sort],
  );

  useEffect(() => {
    if (reduced || !listRef.current || offers.length === 0) return;
    const cards = listRef.current.querySelectorAll("[data-card]");
    gsap.fromTo(
      cards,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, ease: "power2.out" },
    );
  }, [offers, reduced]);

  async function handleSearch(query: HotelSearchQuery) {
    setLoading(true);
    setError(null);
    setNights(nightsBetween(query.checkIn, query.checkOut));
    try {
      setResult(await searchHotels(query));
    } catch (err) {
      setResult(null);
      setError(toBackendError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 lg:px-8 lg:py-10">
      <AnimatedSection direction="up" distance={18}>
        <div className="mb-6 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-primary/10 text-primary shadow-sm">
            <Hotel className="size-6" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Hotels</h1>
            <p className="text-sm text-muted-foreground">Find stays by city and date</p>
          </div>
        </div>
      </AnimatedSection>

      <AnimatedSection direction="up" distance={18} delay={0.05}>
        <HotelSearchForm loading={loading} onSearch={handleSearch} />
      </AnimatedSection>

      {result?.demo && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <FlaskConical className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-500" />
          <p>
            <span className="font-medium">Demo data.</span> No LiteAPI key is
            configured, so these hotels are locally generated samples. Add{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              LITEAPI_API_KEY
            </code>{" "}
            to your <code className="rounded bg-muted px-1 py-0.5 text-xs">.env</code>{" "}
            to search real hotels — keys at liteapi.travel, see the README.
          </p>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
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
              className="flex gap-4 rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <Skeleton className="size-24 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2 py-1">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-6 w-20 self-start" />
            </div>
          ))}
        </div>
      )}

      {!loading && result && (
        <>
          <div className="mb-3 mt-6 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {offers.length} propert{offers.length === 1 ? "y" : "ies"}
            </p>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="w-44" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price">Cheapest first</SelectItem>
                <SelectItem value="score">Best reviewed</SelectItem>
                <SelectItem value="stars">Most stars</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div ref={listRef} className="space-y-3">
            {offers.map((offer) => (
              <div key={offer.id} data-card>
                <HotelOfferCard offer={offer} nights={nights} />
              </div>
            ))}
            {offers.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <Hotel className="size-6 text-muted-foreground" aria-hidden />
                <p className="text-sm text-muted-foreground">
                  No stays for these dates — try a nearby city or a shorter
                  window.
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {!loading && !result && !error && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-secondary text-primary">
            <Hotel className="size-7" aria-hidden />
          </div>
          <p className="font-serif text-xl text-foreground">Where are you staying?</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Search a city and I&apos;ll find stays — rates, stars, review
            scores. Try <span className="font-medium text-foreground">Rome, IT</span> to explore.
          </p>
        </div>
      )}
    </div>
  );
}
