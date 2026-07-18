import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  formatDuration,
  formatMoney,
  formatTime,
  titleCaseIfShouty,
} from "@/lib/format";
import type { FlightItinerary, FlightOffer } from "@/lib/types";

function stopsLabel(itinerary: FlightItinerary): string {
  if (itinerary.stops === 0) return "Nonstop";
  const via = itinerary.segments
    .slice(0, -1)
    .map((s) => s.arrival.iataCode)
    .join(", ");
  return `${itinerary.stops} stop${itinerary.stops > 1 ? "s" : ""} · ${via}`;
}

/** Days between departure and final arrival, for the "+1" marker. */
function dayOffset(itinerary: FlightItinerary): number {
  const first = itinerary.segments[0]?.departure.at.slice(0, 10);
  const last = itinerary.segments.at(-1)?.arrival.at.slice(0, 10);
  if (!first || !last) return 0;
  return Math.round(
    (new Date(`${last}T00:00:00`).getTime() - new Date(`${first}T00:00:00`).getTime()) /
      86_400_000,
  );
}

function ItineraryRow({ itinerary }: { itinerary: FlightItinerary }) {
  const first = itinerary.segments[0];
  const last = itinerary.segments.at(-1);
  if (!first || !last) return null;
  const offset = dayOffset(itinerary);
  const carriers = [
    ...new Set(
      itinerary.segments.map((s) =>
        titleCaseIfShouty(s.carrierName ?? s.carrierCode),
      ),
    ),
  ].join(" · ");

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
      <div className="min-w-44">
        <div className="text-lg font-semibold tabular-nums">
          {formatTime(first.departure.at)} – {formatTime(last.arrival.at)}
          {offset > 0 && (
            <sup className="ml-0.5 text-xs font-normal text-muted-foreground">
              +{offset}
            </sup>
          )}
        </div>
        <div className="text-xs text-muted-foreground">{carriers}</div>
      </div>

      <div className="min-w-28">
        <div className="text-sm font-medium tabular-nums">
          {first.departure.iataCode} → {last.arrival.iataCode}
        </div>
        <div className="text-xs text-muted-foreground">
          {formatDuration(itinerary.duration)}
        </div>
      </div>

      <Badge variant={itinerary.stops === 0 ? "secondary" : "outline"}>
        {stopsLabel(itinerary)}
      </Badge>
    </div>
  );
}

export function FlightOfferCard({ offer }: { offer: FlightOffer }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-6 py-4">
        <div className="flex flex-1 flex-col gap-3">
          {offer.itineraries.map((itinerary, index) => (
            <div key={index} className="flex flex-col gap-3">
              {index > 0 && <Separator />}
              <ItineraryRow itinerary={itinerary} />
            </div>
          ))}
        </div>

        <div className="flex flex-col items-end gap-1 border-l pl-6">
          <div className="text-2xl font-semibold tabular-nums">
            {formatMoney(offer.totalPrice, offer.currency)}
          </div>
          <div className="text-xs text-muted-foreground">total, all travelers</div>
          {offer.seatsRemaining != null && offer.seatsRemaining <= 4 && (
            <div className="text-xs font-medium text-amber-600 dark:text-amber-500">
              {offer.seatsRemaining} seats left
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
