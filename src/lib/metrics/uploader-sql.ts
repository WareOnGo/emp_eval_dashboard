import { ignoredUploaders, uploaderAliasEntries } from "@/lib/uploaders";

/**
 * Mirrors `resolveUploader()` as SQL so warehouse rows can be grouped by
 * employee inside the database instead of in JS. Values come from our own env,
 * but quotes are escaped anyway so a stray apostrophe can't break the query.
 */

function literal(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

/** Normalised `uploadedBy`: trimmed, lowercased, internal whitespace collapsed. */
export function normalisedUploaderSql(alias = "w") {
  return `lower(btrim(regexp_replace(${alias}."uploadedBy", '\\s+', ' ', 'g')))`;
}

/**
 * Expression resolving `uploadedBy` to a canonical email, or NULL when the value
 * is ignored or unrecognised. Bare emails fall through as themselves.
 */
export function uploaderEmailSql(alias = "w") {
  const key = normalisedUploaderSql(alias);
  const whens = uploaderAliasEntries()
    .map(({ alias: a, email }) => `      WHEN ${literal(a)} THEN ${literal(email)}`)
    .join("\n");
  const ignored = ignoredUploaders().map(literal).join(", ");

  // Simple CASE over the normalised key — the WHEN arms are values, not predicates.
  return `CASE ${key}
${whens}
      ELSE CASE
        WHEN ${ignored.length > 0 ? `${key} IN (${ignored})` : "FALSE"} THEN NULL
        WHEN ${key} LIKE '%@%' THEN ${key}
        ELSE NULL
      END
    END`;
}
