/**
 * Agreed baselines and 3-month targets. Baselines are the numbers signed off on
 * 2026-08-20 — they are shown next to live values so drift is visible, and are
 * intentionally not recomputed.
 */
export const TARGETS = {
  northStar: { baseline: 77.1, target: 90, unit: "%" },
  entriesPerMonth: { baseline: 151, target: 200, unit: "" },
  fillRate: { baseline: 32.5, target: 40, unit: "%" },
  visibility: { baseline: 81.9, target: 98, unit: "%" },
  /**
   * Lower is better; no formal target agreed yet, so this is a working ceiling.
   * Baseline is the (lat, lng, maps link) definition: 99 redundant rows of 1,437
   * in scope. Earlier readings of the same data gave 20.1% (every row in a
   * coordinate cluster, paste errors included) and 9.5% (excess rows, coordinates
   * only) — both overstated it by conflating reused map links with duplicates.
   */
  duplication: { baseline: 6.9, target: 5, unit: "%" },
} as const;

/** Fields below this fill rate are called out as weak. */
export const WEAK_FIELD_THRESHOLD = 60;
