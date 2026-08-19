/**
 * Fields counted by the warehouse fill-rate metric: every column on "Warehouse"
 * except the system/derived ones listed in EXCLUDED_COLUMNS.
 *
 * Generated from information_schema — re-derive if the table gains columns.
 * Scope deliberately stops at "Warehouse": adding WarehouseData's 11 columns
 * moves the number to 34.3% and breaks continuity with the agreed 32.5% baseline.
 */

/** How "filled" is decided — blank strings and empty arrays/objects don't count. */
export type FieldKind = "text" | "array" | "json" | "scalar";

export type FillField = {
  column: string;
  kind: FieldKind;
};

export const EXCLUDED_COLUMNS = ["id","createdAt","status_updated_at","photosWebp"] as const;

export const FILL_FIELDS: FillField[] = [
  { column: "warehouseOwnerType", kind: "text" },
  { column: "warehouseType", kind: "text" },
  { column: "address", kind: "text" },
  { column: "googleLocation", kind: "text" },
  { column: "city", kind: "text" },
  { column: "state", kind: "text" },
  { column: "postalCode", kind: "text" },
  { column: "zone", kind: "text" },
  { column: "contactPerson", kind: "text" },
  { column: "contactNumber", kind: "text" },
  { column: "totalSpaceSqft", kind: "array" },
  { column: "offeredSpaceSqft", kind: "text" },
  { column: "numberOfDocks", kind: "text" },
  { column: "clearHeightFt", kind: "text" },
  { column: "compliances", kind: "text" },
  { column: "otherSpecifications", kind: "text" },
  { column: "ratePerSqft", kind: "text" },
  { column: "availability", kind: "text" },
  { column: "uploadedBy", kind: "text" },
  { column: "isBroker", kind: "text" },
  { column: "photos", kind: "text" },
  { column: "visibility", kind: "scalar" },
  { column: "media", kind: "json" },
  { column: "alt_phone_number", kind: "text" },
  { column: "land_parcel_size", kind: "text" },
  { column: "builtup_area", kind: "text" },
  { column: "owner_warmnth", kind: "text" },
  { column: "distance_from_highway", kind: "text" },
  { column: "is_builder", kind: "scalar" },
  { column: "owner_of_multiple_sites", kind: "text" },
  { column: "carpet_area", kind: "text" },
  { column: "nearest_transport", kind: "text" },
  { column: "fire_exits", kind: "text" },
  { column: "fire_compliance_cert_type", kind: "text" },
  { column: "negotiated_rent", kind: "text" },
  { column: "washroom_count", kind: "text" },
  { column: "ownerCompanyName", kind: "text" },
  { column: "ownerAltPoc", kind: "text" },
  { column: "gateSizeFt", kind: "text" },
  { column: "dockApronLengthFt", kind: "text" },
  { column: "setbackArea", kind: "text" },
  { column: "ccRoads", kind: "text" },
  { column: "wallAndSecurityRoom", kind: "text" },
  { column: "plinthHeightFt", kind: "text" },
  { column: "dockDimension", kind: "text" },
  { column: "canopyType", kind: "text" },
  { column: "dockPlatformType", kind: "text" },
  { column: "otherDockingSpecs", kind: "text" },
  { column: "flooringType", kind: "text" },
  { column: "floorStrengthPerSqm", kind: "text" },
  { column: "ventilationType", kind: "text" },
  { column: "ventilationAirChangesPerDay", kind: "text" },
  { column: "insulationPresent", kind: "text" },
  { column: "insulationType", kind: "text" },
  { column: "lightingDetails", kind: "text" },
  { column: "wogVerified", kind: "scalar" },
  { column: "centreHeight", kind: "text" },
  { column: "listing_type", kind: "text" },
  { column: "handoverDate", kind: "scalar" },
  { column: "lockInDate", kind: "scalar" },
  { column: "status", kind: "text" },
  { column: "cam", kind: "text" },
  { column: "chargeableArea", kind: "scalar" },
  { column: "scoutNotes", kind: "text" },
  { column: "liftAccess", kind: "scalar" },
  { column: "liftLoadCapacity", kind: "text" },
  { column: "passengerLiftCount", kind: "text" },
  { column: "serviceLiftCount", kind: "text" },
  { column: "totalFloors", kind: "text" },
  { column: "micromarket", kind: "array" },
  { column: "handoverLeadUnit", kind: "scalar" },
  { column: "handoverLeadValue", kind: "scalar" },
  { column: "handoverType", kind: "scalar" },
  { column: "waterSupply", kind: "scalar" },
];

export const FILL_FIELD_COUNT = FILL_FIELDS.length;

/** SQL predicate that is true when this field counts as filled. */
export function filledPredicate(field: FillField, alias = "w") {
  const col = `${alias}."${field.column}"`;
  switch (field.kind) {
    case "text":
      return `(${col} IS NOT NULL AND btrim(${col}) <> '')`;
    case "array":
      return `(${col} IS NOT NULL AND cardinality(${col}) > 0)`;
    case "json":
      return `(${col} IS NOT NULL AND ${col}::text NOT IN ('null', '{}', '[]', '""'))`;
    case "scalar":
      return `(${col} IS NOT NULL)`;
  }
}

/** Sums the filled predicates into a single 0..n "filled cells per row" expression. */
export function filledCellsExpression(alias = "w") {
  return FILL_FIELDS.map((f) => `(${filledPredicate(f, alias)})::int`).join(" + ");
}
