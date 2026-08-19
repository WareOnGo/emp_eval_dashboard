import { formatCount, formatMonth, formatPercent } from "@/lib/format";
import type { MonthPoint } from "@/lib/types";

/**
 * Server-rendered SVG. No client JS: hover comes from native <title> tooltips,
 * and every value is also reachable in a table elsewhere on the page, so nothing
 * is gated behind hover.
 *
 * Marks follow one spec throughout: solid fills in the single series colour, bars
 * capped at 24px with a 4px rounded top and square baseline, hairline solid
 * gridlines, and labels only on the extreme and the latest point.
 */

const BAR_MAX_W = 24;

/** Rounded-top, square-bottom bar. */
function barPath(x: number, y: number, w: number, h: number, r = 4) {
  const radius = Math.min(r, w / 2, h);
  return [
    `M${x},${y + h}`,
    `L${x},${y + radius}`,
    `Q${x},${y} ${x + radius},${y}`,
    `L${x + w - radius},${y}`,
    `Q${x + w},${y} ${x + w},${y + radius}`,
    `L${x + w},${y + h}`,
    "Z",
  ].join(" ");
}

/** Round a max up to a clean axis bound. */
function niceMax(value: number) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
    if (value <= step * magnitude) return step * magnitude;
  }
  return 10 * magnitude;
}

export function MonthlyColumns({
  points,
  target,
  label = "entries",
}: {
  points: MonthPoint[];
  target?: number;
  label?: string;
}) {
  if (points.length === 0) {
    return <p className="px-5 py-8 text-center text-[13px] text-ink-3">No entries recorded.</p>;
  }

  const W = 720;
  const H = 220;
  const pad = { top: 22, right: 16, bottom: 28, left: 40 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const max = niceMax(Math.max(target ?? 0, ...points.map((p) => p.count)));
  const slot = innerW / points.length;
  const barW = Math.min(BAR_MAX_W, slot * 0.55);
  const y = (v: number) => pad.top + innerH - (innerH * v) / max;
  const ticks = [0, max / 2, max];

  const peak = points.reduce((best, p) => (p.count > best.count ? p : best), points[0]);
  const last = points[points.length - 1];
  const labelled = new Set([peak.month, last.month]);

  return (
    <div className="px-3 pb-3 pt-1">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Monthly ${label}, ${formatMonth(points[0].month)} to ${formatMonth(last.month)}`}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={pad.left}
              x2={pad.left + innerW}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--color-line)"
              strokeWidth="1"
            />
            <text
              x={pad.left - 8}
              y={y(t) + 4}
              textAnchor="end"
              className="fill-[var(--color-ink-3)] text-[11px] [font-variant-numeric:tabular-nums]"
            >
              {formatCount(Math.round(t))}
            </text>
          </g>
        ))}

        {target !== undefined ? (
          <>
            <line
              x1={pad.left}
              x2={pad.left + innerW}
              y1={y(target)}
              y2={y(target)}
              stroke="var(--color-ink-3)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <text
              x={pad.left + innerW}
              y={y(target) - 6}
              textAnchor="end"
              className="fill-[var(--color-ink-3)] text-[11px]"
            >
              target {formatCount(target)}
            </text>
          </>
        ) : null}

        {points.map((point) => {
          const i = points.indexOf(point);
          const cx = pad.left + slot * i + slot / 2;
          const top = y(point.count);
          const height = Math.max(2, pad.top + innerH - top);

          return (
            <g key={point.month}>
              <title>{`${formatMonth(point.month)}: ${formatCount(point.count)} ${label}`}</title>
              <path d={barPath(cx - barW / 2, top, barW, height)} fill="var(--color-series)" />
              {labelled.has(point.month) ? (
                <text
                  x={cx}
                  y={top - 7}
                  textAnchor="middle"
                  className="fill-[var(--color-ink-2)] text-[11px] [font-variant-numeric:tabular-nums]"
                >
                  {formatCount(point.count)}
                </text>
              ) : null}
              <text
                x={cx}
                y={H - 9}
                textAnchor="middle"
                className="fill-[var(--color-ink-3)] text-[11px]"
              >
                {formatMonth(point.month).replace(" ", " ")}
              </text>
            </g>
          );
        })}

        <line
          x1={pad.left}
          x2={pad.left + innerW}
          y1={pad.top + innerH}
          y2={pad.top + innerH}
          stroke="var(--color-line-strong)"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}

/**
 * One series, one colour. Bars are not shaded by value — the length already
 * carries the magnitude, so hue would be double-encoding.
 */
export function ValueBars({
  rows,
  suffix = "%",
  max = 100,
}: {
  rows: Array<{ label: string; value: number; caption?: string }>;
  suffix?: string;
  max?: number;
}) {
  return (
    <ul className="divide-y divide-line">
      {rows.map((row) => (
        <li key={row.label} className="px-5 py-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-[13px] text-ink">{row.label}</span>
            <span className="shrink-0 text-[13px] text-ink-2 [font-variant-numeric:tabular-nums]">
              {suffix === "%" ? formatPercent(row.value) : `${formatCount(row.value)}${suffix}`}
              {row.caption ? <span className="ml-2 text-xs text-ink-3">{row.caption}</span> : null}
            </span>
          </div>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-sm bg-series/15">
            <div
              className="h-full rounded-sm bg-series"
              style={{ width: `${Math.max(0.8, Math.min(100, (row.value / max) * 100))}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export type FunnelRow = {
  stage: string;
  deals: number;
  /** counted = in the numerator, gap = the shortfall, excluded = out of scope. */
  role: "counted" | "gap" | "excluded";
};

const FUNNEL_FILL: Record<FunnelRow["role"], string> = {
  counted: "var(--color-series)",
  gap: "var(--color-warn)",
  excluded: "var(--color-line-strong)",
};

const FUNNEL_LEGEND: Array<{ role: FunnelRow["role"]; label: string }> = [
  { role: "counted", label: "Counted — proposal shared or beyond" },
  { role: "gap", label: "The gap — RFQ received, no proposal yet" },
  { role: "excluded", label: "Excluded from the metric" },
];

/** Horizontal bars for deal stages, with the legend carrying the three roles. */
export function StageFunnel({ rows }: { rows: FunnelRow[] }) {
  const max = Math.max(...rows.map((r) => r.deals), 1);

  return (
    <div>
      <ul className="divide-y divide-line">
        {rows.map((row) => (
          <li key={row.stage} className="flex items-center gap-3 px-5 py-2">
            <span className="w-36 shrink-0 truncate text-xs text-ink-2">
              {row.stage.replace(/_/g, " ").toLowerCase()}
            </span>
            <span className="relative h-3.5 flex-1">
              <span
                className="absolute inset-y-0 left-0 rounded-r-sm"
                style={{
                  width: `${Math.max(0.8, (row.deals / max) * 100)}%`,
                  backgroundColor: FUNNEL_FILL[row.role],
                }}
                title={`${row.stage.replace(/_/g, " ").toLowerCase()}: ${row.deals} deals`}
              />
            </span>
            <span className="w-9 shrink-0 text-right text-[13px] text-ink [font-variant-numeric:tabular-nums]">
              {row.deals}
            </span>
          </li>
        ))}
      </ul>
      <ul className="flex flex-wrap gap-x-5 gap-y-1.5 border-t border-line px-5 py-3">
        {FUNNEL_LEGEND.map((item) => (
          <li key={item.role} className="flex items-center gap-2 text-xs text-ink-3">
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-sm"
              style={{ backgroundColor: FUNNEL_FILL[item.role] }}
            />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
