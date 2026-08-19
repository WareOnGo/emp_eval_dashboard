/**
 * `Warehouse.googleLocation` is the Google Maps link a scout pasted, and it is
 * the origin of the row's coordinates: no link in the table resolves to two
 * different lat/long pairs. That makes the link the better identity for a
 * location than the coordinates it produced — if the wrong link was pasted, the
 * coordinates are wrong in exactly the same way, so coordinates alone cannot
 * tell a duplicate apart from a paste error.
 *
 * Duplicates are therefore keyed on (lat, lng, link).
 */

/**
 * Not every value is a link. 151 rows hold something else — the literal string
 * "NA" on 19 of them, plus bare place names like "Madanpur". Those must never
 * act as a matching key: keying on "NA" would group 19 unrelated entries across
 * 7 cities as duplicates of each other.
 *
 * Accepted shapes: maps.app.goo.gl and goo.gl/maps short links, any google.*
 * URL (maps.google.com/?q=…, google.com/maps/place/…), share.google links, and
 * a bare "lat,long" pair.
 */
export function usableMapsLinkSql(alias = "w") {
  const col = `${alias}."googleLocation"`;
  return `(${col} IS NOT NULL
    AND btrim(${col}) <> ''
    AND (${col} ~* 'goo\\.gl|google\\.'
         OR ${col} ~ '^-?[0-9]+\\.[0-9]+\\s*,\\s*-?[0-9]+\\.[0-9]+$'))`;
}

/** Lowercased, trimmed, protocol and www stripped, so casing can't split a pair. */
export function normalisedMapsLinkSql(alias = "w") {
  return `lower(btrim(regexp_replace(${alias}."googleLocation", '^https?://(www\\.)?', '')))`;
}
