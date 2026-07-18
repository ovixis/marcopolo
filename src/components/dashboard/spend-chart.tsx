"use client";

import { useState } from "react";

import { chartColors, spendSeries } from "@/lib/demo-dashboard";

const W = 560;
const H = 200;
const PAD = { top: 18, right: 16, bottom: 26, left: 42 };

/**
 * Cumulative trip-spending area chart. Single series (no legend needed);
 * crosshair + tooltip on hover, latest value chip when idle.
 */
export function SpendChart() {
  const [hover, setHover] = useState<number | null>(null);

  const max = Math.max(...spendSeries.map((d) => d.value));
  const yMax = Math.ceil(max / 1000) * 1000 || 1000;
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const x = (i: number) =>
    PAD.left + (i / (spendSeries.length - 1)) * innerW;
  const y = (v: number) => PAD.top + innerH - (v / yMax) * innerH;

  const linePath = spendSeries
    .map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L${x(spendSeries.length - 1).toFixed(1)},${
    PAD.top + innerH
  } L${x(0).toFixed(1)},${PAD.top + innerH} Z`;

  const yTicks = [0, yMax / 2, yMax];
  const active = hover ?? spendSeries.length - 1;
  const activePoint = spendSeries[active];

  function handleMove(event: React.MouseEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - PAD.left) / innerW) * (spendSeries.length - 1));
    setHover(Math.max(0, Math.min(spendSeries.length - 1, i)));
  }

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Cumulative trip spending by month, latest ${activePoint.label}: $${activePoint.value.toLocaleString()}`}
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chartColors.primary} stopOpacity="0.28" />
            <stop offset="100%" stopColor={chartColors.primary} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* recessive grid + y labels */}
        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(t)}
              y2={y(t)}
              className="stroke-border"
              strokeWidth="1"
              strokeDasharray={t === 0 ? undefined : "3 5"}
            />
            <text
              x={PAD.left - 8}
              y={y(t) + 3}
              textAnchor="end"
              className="fill-muted-foreground"
              fontSize="10"
            >
              {t >= 1000 ? `$${t / 1000}k` : `$${t}`}
            </text>
          </g>
        ))}

        <path d={areaPath} fill="url(#spendFill)" />
        <path
          d={linePath}
          fill="none"
          stroke={chartColors.primary}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* x labels */}
        {spendSeries.map((d, i) => (
          <text
            key={d.label}
            x={x(i)}
            y={H - 8}
            textAnchor="middle"
            fontSize="10"
            className={
              i === active
                ? "fill-foreground font-medium"
                : "fill-muted-foreground"
            }
          >
            {d.label}
          </text>
        ))}

        {/* crosshair + active point */}
        <line
          x1={x(active)}
          x2={x(active)}
          y1={PAD.top}
          y2={PAD.top + innerH}
          className="stroke-border"
          strokeWidth="1"
        />
        <circle
          cx={x(active)}
          cy={y(activePoint.value)}
          r="5"
          fill={chartColors.primary}
          className="stroke-card"
          strokeWidth="2"
        />

        {/* value chip */}
        <g
          transform={`translate(${Math.min(x(active) + 10, W - 96)}, ${Math.max(
            y(activePoint.value) - 34,
            6,
          )})`}
        >
          <rect
            width="86"
            height="26"
            rx="6"
            fill={chartColors.primary}
          />
          <text
            x="43"
            y="17"
            textAnchor="middle"
            fontSize="12"
            fontWeight="600"
            fill="#FFFFFF"
          >
            ${activePoint.value.toLocaleString()}
          </text>
        </g>
      </svg>
      <figcaption className="sr-only">
        Cumulative spending: {spendSeries.map((d) => `${d.label} $${d.value}`).join(", ")}
      </figcaption>
    </figure>
  );
}
