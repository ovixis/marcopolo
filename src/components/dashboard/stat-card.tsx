import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  note?: string;
  /** 0-100: renders a slim progress bar under the value. */
  progress?: number;
  /** Hero variant gets the navy→cyan gradient treatment. */
  hero?: boolean;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  note,
  progress,
  hero = false,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden",
        hero &&
          "border-transparent bg-gradient-to-br from-[#0B2540] via-[#0E3A5C] to-[#0891B2] text-white",
      )}
    >
      <CardContent className="flex flex-col gap-3 py-5">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "rounded-md p-1.5",
              hero ? "bg-white/15" : "bg-primary/10",
            )}
          >
            <Icon
              className={cn("size-4", hero ? "text-cyan-200" : "text-primary")}
              aria-hidden
            />
          </div>
          <span
            className={cn(
              "text-xs font-medium uppercase tracking-wider",
              hero ? "text-cyan-100/90" : "text-muted-foreground",
            )}
          >
            {label}
          </span>
        </div>
        <div className="text-3xl font-semibold tracking-tight tabular-nums">
          {value}
        </div>
        {typeof progress === "number" && (
          <div
            className={cn(
              "h-1.5 w-full overflow-hidden rounded-full",
              hero ? "bg-white/20" : "bg-muted",
            )}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={cn(
                "h-full rounded-full",
                hero ? "bg-cyan-300" : "bg-[#0891B2]",
              )}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        )}
        {note && (
          <p
            className={cn(
              "text-xs",
              hero ? "text-cyan-100/80" : "text-muted-foreground",
            )}
          >
            {note}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
