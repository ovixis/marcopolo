import { CircleCheck, CircleDashed, Clock3 } from "lucide-react";

import { readinessItems } from "@/lib/demo-dashboard";
import { chartColors } from "@/lib/demo-dashboard";

/** Trip preparation checklist with an overall progress bar. */
export function ReadinessList() {
  const done = readinessItems.filter((i) => i.status === "done").length;
  const pct = Math.round((done / readinessItems.length) * 100);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="mb-2 flex items-baseline justify-between text-base">
          <span className="text-muted-foreground">
            {done} of {readinessItems.length} complete
          </span>
          <span className="font-medium tabular-nums">{pct}%</span>
        </div>
        <div
          className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${pct}%`, backgroundColor: chartColors.primary }}
          />
        </div>
      </div>

      <ul className="flex flex-col gap-3">
        {readinessItems.map((item) => (
          <li key={item.label} className="flex items-center gap-3 text-base">
            {item.status === "done" && (
              <CircleCheck
                className="size-5 shrink-0"
                style={{ color: chartColors.primary }}
                aria-label="Done"
              />
            )}
            {item.status === "processing" && (
              <Clock3
                className="size-5 shrink-0"
                style={{ color: chartColors.processing }}
                aria-label="In progress"
              />
            )}
            {item.status === "todo" && (
              <CircleDashed
                className="size-5 shrink-0"
                style={{ color: chartColors.attention }}
                aria-label="To do"
              />
            )}
            <span
              className={
                item.status === "done" ? "text-muted-foreground" : undefined
              }
            >
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
