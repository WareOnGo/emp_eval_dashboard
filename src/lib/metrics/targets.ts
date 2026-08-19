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
   * The baseline is the corrected definition: 136 redundant rows of 1,438
   * geocoded, with the 15 multi-city (bad-coordinate) clusters excluded. The
   * 20.1% first quoted counted every row in a cluster and folded those in.
   */
  duplication: { baseline: 9.5, target: 5, unit: "%" },
} as const;

/** Fields below this fill rate are called out as weak. */
export const WEAK_FIELD_THRESHOLD = 60;
