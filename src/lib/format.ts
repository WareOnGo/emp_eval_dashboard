/** Initials from a display name, e.g. "Nikesh Gupta" -> "NG". */
export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function formatCount(value: number) {
  return value.toLocaleString("en-IN");
}

export function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

/** "2026-08" -> "Aug '26" */
export function formatMonth(month: string) {
  const [year, m] = month.split("-");
  const label = new Date(Number(year), Number(m) - 1, 1).toLocaleDateString("en-IN", {
    month: "short",
  });
  return `${label} '${year.slice(2)}`;
}

export function formatPercent(value: number, places = 1) {
  return `${value.toFixed(places)}%`;
}

/** Signed absolute change, for "vs. prior period" deltas. */
export function formatDelta(current: number, previous: number) {
  const delta = current - previous;
  if (delta === 0) return "no change";
  return `${delta > 0 ? "+" : "−"}${Math.abs(delta).toLocaleString("en-IN")}`;
}

/** Turn a camelCase / snake_case column name into something readable. */
export function humaniseField(column: string) {
  return column
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/\bsqft\b/, "sq ft")
    .replace(/\bft\b/, "ft")
    .replace(/\bpoc\b/, "POC")
    .replace(/\bnoc\b/, "NOC")
    .replace(/\bcam\b/, "CAM")
    .replace(/^./, (c) => c.toUpperCase());
}

/**
 * Status of a value against its target. Returned as a state, not a colour —
 * callers pair it with a text label so colour is never the only signal.
 */
export type Status = "ok" | "warn" | "bad";

/** Higher is better. */
export function statusVsTarget(value: number, target: number): Status {
  if (target <= 0) return "ok";
  const ratio = value / target;
  if (ratio >= 1) return "ok";
  if (ratio >= 0.8) return "warn";
  return "bad";
}

/** Lower is better (duplication). */
export function statusVsCeiling(value: number, ceiling: number): Status {
  if (value <= ceiling) return "ok";
  if (value <= ceiling * 2) return "warn";
  return "bad";
}

export const STATUS_TEXT: Record<Status, string> = {
  ok: "text-good",
  warn: "text-warn",
  bad: "text-bad",
};

export const STATUS_LABEL: Record<Status, string> = {
  ok: "on target",
  warn: "near target",
  bad: "under target",
};

export const CEILING_LABEL: Record<Status, string> = {
  ok: "within ceiling",
  warn: "above ceiling",
  bad: "well above ceiling",
};
