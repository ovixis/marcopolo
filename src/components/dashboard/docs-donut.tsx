import { chartColors, travelDocs, type DocStatus } from "@/lib/demo-dashboard";

const STATUS_COLOR: Record<DocStatus, string> = {
  ready: chartColors.primary,
  processing: chartColors.processing,
  action: chartColors.attention,
};

const SIZE = 148;
const R = 56;
const STROKE = 16;
const GAP_DEG = 4;

function arcPath(startDeg: number, endDeg: number): string {
  const c = SIZE / 2;
  const rad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const sx = c + R * Math.cos(rad(startDeg));
  const sy = c + R * Math.sin(rad(startDeg));
  const ex = c + R * Math.cos(rad(endDeg));
  const ey = c + R * Math.sin(rad(endDeg));
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M${sx.toFixed(2)},${sy.toFixed(2)} A${R},${R} 0 ${large} 1 ${ex.toFixed(2)},${ey.toFixed(2)}`;
}

/** Travel-documents readiness donut with center hero number and legend. */
export function DocsDonut() {
  // Precompute each segment's start angle (cumulative sum of prior sweeps).
  const starts = travelDocs.segments.map((_, i) =>
    travelDocs.segments
      .slice(0, i)
      .reduce((sum, s) => sum + (s.pct / 100) * 360, 0),
  );
  const arcs = travelDocs.segments.map((segment, i) => {
    const sweep = (segment.pct / 100) * 360;
    const start = starts[i] + GAP_DEG / 2;
    const end = starts[i] + sweep - GAP_DEG / 2;
    return { ...segment, d: arcPath(start, Math.max(end, start + 1)) };
  });

  return (
    <div className="flex items-center gap-6">
      <div className="relative shrink-0">
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={`Travel documents: ${travelDocs.readyPct}% ready`}
        >
          {arcs.map((arc) => (
            <path
              key={arc.label}
              d={arc.d}
              fill="none"
              stroke={STATUS_COLOR[arc.status]}
              strokeWidth={STROKE}
              strokeLinecap="round"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums">
            {travelDocs.readyPct}%
          </span>
          <span className="text-xs text-muted-foreground">ready</span>
        </div>
      </div>

      <ul className="flex flex-1 flex-col gap-2.5">
        {travelDocs.segments.map((segment) => (
          <li key={segment.label} className="flex items-center gap-2.5 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: STATUS_COLOR[segment.status] }}
              aria-hidden
            />
            <span className="flex-1">{segment.label}</span>
            <span className="text-muted-foreground tabular-nums">
              {segment.count} · {segment.pct}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
