/**
 * `Warehouse.uploadedBy` is free text: newer rows carry an @wareongo.com email,
 * older rows carry a first name, initials, or junk. This resolves those values
 * onto a canonical email so warehouse work can be attributed to an employee.
 *
 * The alias map lives in env (WAREHOUSE_UPLOADER_ALIASES) rather than in code
 * because it is operational data the team edits as the roster changes.
 */

/** Trim, lowercase, collapse internal whitespace — makes matching forgiving. */
export function normaliseUploader(raw: string) {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

function parsePairs(value: string | undefined) {
  const map = new Map<string, string>();
  if (!value) return map;

  for (const entry of value.split(";")) {
    const [alias, email] = entry.split("=");
    if (!alias || !email) continue;
    map.set(normaliseUploader(alias), email.trim().toLowerCase());
  }

  return map;
}

function parseList(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(";")
      .map(normaliseUploader)
      .filter(Boolean),
  );
}

const ALIASES = parsePairs(process.env.WAREHOUSE_UPLOADER_ALIASES);
const IGNORED = parseList(process.env.WAREHOUSE_UPLOADER_IGNORE);

export type UploaderResolution =
  | { kind: "employee"; email: string }
  | { kind: "ignored"; raw: string }
  | { kind: "unknown"; raw: string };

/**
 * Resolves one raw `uploadedBy` value. Anything on the ignore list, or that is
 * neither a known alias nor an email, stays unattributed rather than being
 * guessed at — a wrong attribution is worse than a missing one here.
 */
export function resolveUploader(raw: string | null | undefined): UploaderResolution {
  if (!raw) return { kind: "unknown", raw: "" };

  const key = normaliseUploader(raw);
  if (!key) return { kind: "unknown", raw };
  if (IGNORED.has(key)) return { kind: "ignored", raw };

  const mapped = ALIASES.get(key);
  if (mapped) return { kind: "employee", email: mapped };

  // Bare emails pass through; the roster join decides whether they count.
  if (key.includes("@")) return { kind: "employee", email: key };

  return { kind: "unknown", raw };
}

/** Every alias→email pair, for building SQL CASE expressions or debug views. */
export function uploaderAliasEntries() {
  return [...ALIASES.entries()].map(([alias, email]) => ({ alias, email }));
}

export function ignoredUploaders() {
  return [...IGNORED];
}
