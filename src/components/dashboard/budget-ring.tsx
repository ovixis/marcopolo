import { chartColors, demoTrip } from "@/lib/demo-dashboard";
import { formatMoney } from "@/lib/format";

const SIZE = 148;
const STROKE = 14;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

/** Compact spent-vs-budget ring for the dashboard bento. */
export function BudgetRing() {
  const pct = Math.min(
    Math.round((demoTrip.budgetSpent / demoTrip.budgetTotal) * 100),
    100,
  );
  const remaining = demoTrip.budgetTotal - demoTrip.budgetSpent;

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE}
            className="text-border"
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke={chartColors.primary}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - pct / 100)}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold tabular-nums">{pct}%</span>
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
            used
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 text-base">
        <div>
          <div className="text-2xl font-semibold tabular-nums">
            {formatMoney(String(demoTrip.budgetSpent), demoTrip.currency)}
          </div>
          <div className="text-sm text-muted-foreground">
            of {formatMoney(String(demoTrip.budgetTotal), demoTrip.currency)}{" "}
            budget
          </div>
        </div>
        <div className="text-sm font-medium text-emerald-600">
          {formatMoney(String(remaining), demoTrip.currency)} left
        </div>
      </div>
    </div>
  );
}
