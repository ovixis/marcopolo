import Image from "next/image";
import { BedDouble, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import type { HotelOffer } from "@/lib/types";

function Stars({ count }: { count: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      aria-label={`${count} star hotel`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Star
          key={i}
          className="size-3 fill-amber-400 text-amber-400"
          aria-hidden
        />
      ))}
    </span>
  );
}

export function HotelOfferCard({
  offer,
  nights,
}: {
  offer: HotelOffer;
  nights: number;
}) {
  return (
    <Card className="overflow-hidden py-0">
      <CardContent className="flex items-stretch gap-0 p-0">
        <div className="relative h-36 w-44 shrink-0 bg-gradient-to-br from-[#0B2540] to-[#0E7490]">
          {offer.photoUrl ? (
            /* Remote hotel photos come from arbitrary supplier CDNs;
               next/image adds nothing with unoptimized static export. */
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={offer.photoUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Image
                src="/logo.svg"
                alt=""
                width={72}
                height={72}
                className="opacity-40"
                aria-hidden
              />
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-5 py-4">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold">{offer.name}</h3>
            {offer.starRating ? <Stars count={offer.starRating} /> : null}
          </div>
          <p className="truncate text-sm text-muted-foreground">
            {offer.address} · {offer.city}
          </p>
          {(offer.roomName || offer.boardName) && (
            <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
              <BedDouble className="size-3.5 shrink-0" aria-hidden />
              {[offer.roomName, offer.boardName].filter(Boolean).join(" · ")}
            </p>
          )}
          <div className="mt-1 flex items-center gap-2">
            {offer.reviewScore != null && (
              <Badge variant="secondary" className="tabular-nums">
                {offer.reviewScore.toFixed(1)}
              </Badge>
            )}
            {offer.reviewCount != null && (
              <span className="text-xs text-muted-foreground">
                {offer.reviewCount.toLocaleString()} reviews
              </span>
            )}
            {offer.freeCancellation && (
              <Badge variant="outline" className="text-emerald-700 dark:text-emerald-400">
                Free cancellation
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end justify-center gap-1 border-l px-5">
          <div className="text-2xl font-semibold tabular-nums">
            {formatMoney(offer.totalPrice, offer.currency)}
          </div>
          <div className="text-xs text-muted-foreground">
            total · {nights} night{nights === 1 ? "" : "s"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
