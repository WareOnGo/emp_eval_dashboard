import type { ReactNode } from "react";
import { STATUS_LABEL, STATUS_TEXT, initials, type Status } from "@/lib/format";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-line bg-card ${className}`}>{children}</section>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-baseline justify-between gap-4 border-b border-line px-5 py-3.5">
      <div className="min-w-0">
        <h2 className="text-[13px] font-semibold text-ink">{title}</h2>
        {subtitle ? <p className="mt-1 text-xs text-ink-3">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0 text-xs text-ink-3">{action}</div> : null}
    </header>
  );
}

/**
 * Progress toward a target. The fill is the series colour and the track a low
 * step of the same hue, so state reads across the whole bar.
 */
export function Meter({ percent }: { percent: number }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-sm bg-series/15">
      <div
        className="h-full rounded-sm bg-series"
        style={{ width: `${Math.max(1, Math.min(100, percent))}%` }}
      />
    </div>
  );
}

/**
 * Status shown as an icon-ish glyph plus its label, so the state never rests on
 * colour alone.
 */
export function StatusNote({ status, label }: { status: Status; label?: string }) {
  const glyph = { ok: "●", warn: "▲", bad: "▲" }[status];
  return (
    <span className={`inline-flex items-baseline gap-1.5 text-xs ${STATUS_TEXT[status]}`}>
      <span aria-hidden className="text-[9px]">
        {glyph}
      </span>
      {label ?? STATUS_LABEL[status]}
    </span>
  );
}

/**
 * The one large number a page leads with. Proportional figures — tabular digits
 * look loose at display size.
 */
export function Hero({
  value,
  unit,
  caption,
}: {
  value: string;
  unit?: string;
  caption?: ReactNode;
}) {
  return (
    <div>
      <p className="text-5xl font-semibold leading-none tracking-tight text-ink">
        {value}
        {unit ? <span className="ml-0.5 text-2xl font-medium text-ink-3">{unit}</span> : null}
      </p>
      {caption ? <div className="mt-3">{caption}</div> : null}
    </div>
  );
}

/**
 * Stat tile: label · value · footnote · meter · status. The only colour is the
 * series accent, unless the value breaches its target — and then it is labelled.
 */
export function MeterTile({
  label,
  value,
  unit,
  target,
  meter,
  status,
  statusLabel,
  footnote,
}: {
  label: string;
  value: string;
  unit?: string;
  target?: string;
  meter: number;
  status?: Status;
  statusLabel?: string;
  footnote?: string;
}) {
  return (
    <Card className="flex flex-col p-5">
      <p className="text-xs text-ink-3">{label}</p>
      <p className="mt-2.5 text-[28px] font-semibold leading-none tracking-tight text-ink">
        {value}
        {unit ? <span className="ml-0.5 text-lg font-medium text-ink-3">{unit}</span> : null}
      </p>
      {footnote ? <p className="mt-2.5 text-xs text-ink-3">{footnote}</p> : null}
      <div className="mt-4 flex-1" />
      <div className="mt-3">
        <Meter percent={meter} />
        <div className="mt-2 flex items-baseline justify-between gap-3 text-xs text-ink-3">
          {status ? <StatusNote status={status} label={statusLabel} /> : <span />}
          {target ? <span>target {target}</span> : null}
        </div>
      </div>
    </Card>
  );
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "size-6 text-[10px]", md: "size-8 text-[11px]", lg: "size-14 text-base" };

  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full bg-inset font-medium text-ink-2 ${sizes[size]}`}
    >
      {initials(name)}
    </span>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className="text-xs text-ink-3">{eyebrow}</p> : null}
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-[13px] text-ink-2">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="px-5 py-8 text-center text-[13px] text-ink-3">{children}</p>;
}
