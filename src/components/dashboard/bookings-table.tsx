import { Hotel, Plane, Ticket, TrainFront } from "lucide-react";

import { recentBookings } from "@/lib/demo-dashboard";
import { cn } from "@/lib/utils";

const KIND_ICONS = {
  flight: Plane,
  hotel: Hotel,
  experience: Ticket,
  transport: TrainFront,
} as const;

function StatusChip({ status }: { status: "confirmed" | "pending" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        status === "confirmed"
          ? "bg-cyan-600/10 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-400"
          : "bg-amber-600/10 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400",
      )}
    >
      {status === "confirmed" ? "Confirmed" : "Pending"}
    </span>
  );
}

/** Latest bookings across flights, stays, experiences, and transport. */
export function BookingsTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="pb-2 pr-4 font-medium">Item</th>
            <th className="pb-2 pr-4 font-medium">Date</th>
            <th className="pb-2 pr-4 text-right font-medium">Amount</th>
            <th className="pb-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {recentBookings.map((booking) => {
            const Icon = KIND_ICONS[booking.kind];
            return (
              <tr key={booking.title} className="border-b last:border-0">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-md bg-primary/10 p-1.5">
                      <Icon className="size-3.5 text-primary" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{booking.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {booking.detail}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap py-3 pr-4 text-muted-foreground">
                  {booking.date}
                </td>
                <td className="whitespace-nowrap py-3 pr-4 text-right tabular-nums">
                  {booking.amount}
                </td>
                <td className="py-3">
                  <StatusChip status={booking.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
