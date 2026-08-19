import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type {
  CompanyMetrics,
  DuplicationRate,
  Employee,
  EmployeeMetrics,
  EntryCounts,
  FieldFill,
  MonthPoint,
  NorthStarMetric,
  RecentUpload,
  StageCount,
} from "@/lib/types";
import { FILL_FIELDS, FILL_FIELD_COUNT, filledCellsExpression, filledPredicate } from "./fields";
import { normalisedMapsLinkSql, usableMapsLinkSql } from "./maps-link";
import { uploaderEmailSql } from "./uploader-sql";

/**
 * Every metric is computed in Postgres — the tables are large enough that
 * pulling rows into Node to aggregate would be wasteful, and the fill-rate
 * metric touches 74 columns per row.
 *
 * `Warehouse.createdAt` is `timestamp without time zone` holding IST midnight as
 * UTC, so day-boundary windows can be off by a few hours. That is immaterial for
 * 7- and 30-day rolling counts.
 *
 * The exported readers are wrapped in React's `cache()` so a single render that
 * asks for the same metric twice only hits the database once. Cross-request
 * caching is handled by each page's `revalidate`, not here.
 */

/** Deals that never reached the procurement team, so they don't count either way. */
const NSM_EXCLUDED_STAGES = ["NEW_LEAD", "RFQ_NOT_RELEVANT", "DEAL_ON_HOLD", "DEAL_LOST"];

/** Only deals created from this point on are tracked, per the metric definition. */
export const NSM_START = "2026-04-01";

const FILLED_CELLS = filledCellsExpression("w");
const UPLOADER_EMAIL = uploaderEmailSql("w");

function num(value: unknown) {
  return typeof value === "bigint" ? Number(value) : Number(value ?? 0);
}

function pct(part: number, whole: number) {
  if (whole === 0) return 0;
  return Math.round((1000 * part) / whole) / 10;
}

export const getNorthStarMetric = cache(async (): Promise<NorthStarMetric> => {
  const excluded = NSM_EXCLUDED_STAGES.map((s) => `'${s}'`).join(", ");
  const [row] = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
    WITH d AS (
      SELECT stage FROM opportunities
      WHERE deleted_at IS NULL AND twenty_created_at >= '${NSM_START}'
    )
    SELECT
      count(*)::int AS all_deals,
      count(*) FILTER (WHERE stage IN (${excluded}))::int AS excluded,
      count(*) FILTER (WHERE stage = 'RFQ_RECEIVED')::int AS rfq_received,
      count(*) FILTER (WHERE stage NOT IN (${excluded}, 'RFQ_RECEIVED'))::int AS numerator,
      count(*) FILTER (WHERE stage NOT IN (${excluded}))::int AS denominator
    FROM d`);

  const numerator = num(row.numerator);
  const denominator = num(row.denominator);

  return {
    allDeals: num(row.all_deals),
    excluded: num(row.excluded),
    rfqReceived: num(row.rfq_received),
    numerator,
    denominator,
    percent: pct(numerator, denominator),
  };
});

export const getStageBreakdown = cache(async (): Promise<StageCount[]> => {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
    SELECT coalesce(stage, 'UNSET') AS stage, count(*)::int AS deals
    FROM opportunities
    WHERE deleted_at IS NULL AND twenty_created_at >= '${NSM_START}'
    GROUP BY 1 ORDER BY deals DESC`);

  return rows.map((r) => ({ stage: String(r.stage), deals: num(r.deals) }));
});

/**
 * Warehouse-side metrics in one pass. `scope` narrows to a single uploader when
 * building an employee page; omitted, it covers the whole company.
 */
async function warehouseAggregate(scope?: { email: string }) {
  const where = scope ? `WHERE (${UPLOADER_EMAIL}) = '${scope.email.replace(/'/g, "''")}'` : "";

  const [row] = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
    SELECT
      count(*)::int AS rows,
      count(*) FILTER (WHERE w."createdAt" >= now() - interval '7 days')::int AS last7,
      count(*) FILTER (WHERE w."createdAt" >= now() - interval '14 days'
                         AND w."createdAt" <  now() - interval '7 days')::int AS previous7,
      count(*) FILTER (WHERE w."createdAt" >= now() - interval '30 days')::int AS last30,
      count(*) FILTER (WHERE w."createdAt" >= now() - interval '60 days'
                         AND w."createdAt" <  now() - interval '30 days')::int AS previous30,
      count(*) FILTER (WHERE w.visibility)::int AS visible,
      coalesce(sum(${FILLED_CELLS}), 0)::int AS filled_cells
    FROM "Warehouse" w
    ${where}`);

  const rows = num(row.rows);

  return {
    entries: {
      total: rows,
      last7: num(row.last7),
      previous7: num(row.previous7),
      last30: num(row.last30),
      previous30: num(row.previous30),
    } satisfies EntryCounts,
    fill: {
      rows,
      filledCells: num(row.filled_cells),
      totalCells: rows * FILL_FIELD_COUNT,
      percent: pct(num(row.filled_cells), rows * FILL_FIELD_COUNT),
    },
    visibility: {
      rows,
      visible: num(row.visible),
      percent: pct(num(row.visible), rows),
    },
  };
}

/**
 * Duplicate detection keyed on (lat, lng, maps link).
 *
 * The link is the origin of the coordinates — no link in the table resolves to
 * two different lat/long pairs — so coordinates alone cannot separate a real
 * duplicate from a pasted-wrong-link error. Requiring the link to match as well
 * makes a duplicate a high-confidence claim, and isolates the paste errors into
 * their own bucket. See `maps-link.ts` for why placeholder values are excluded.
 *
 * Within a matching (lat, lng, link) group:
 *   · all rows name the same city  → a genuine duplicate; excess = size − 1
 *   · rows name different cities   → the same link pasted onto unrelated entries
 *
 * Per employee only their own duplicates count, so nobody is charged for a
 * colleague uploading the same site. Exact matching is still a floor: near
 * duplicates a few metres apart need a PostGIS proximity search to catch.
 */
const CLUSTER_CTE = `
    WITH pts AS (
      SELECT w.id,
             (${UPLOADER_EMAIL}) AS email,
             lower(btrim(w.city)) AS city,
             ${normalisedMapsLinkSql("w")} AS link,
             round(d.latitude::numeric, 6) AS lat,
             round(d.longitude::numeric, 6) AS lng
      FROM "Warehouse" w
      JOIN "WarehouseData" d ON d."warehouseId" = w.id
      WHERE d.latitude IS NOT NULL AND d.longitude IS NOT NULL
        AND ${usableMapsLinkSql("w")}
    ),
    grouped AS (
      SELECT lat, lng, link, count(*) AS size, count(DISTINCT city) AS cities
      FROM pts GROUP BY lat, lng, link
    ),
    dupes AS (SELECT * FROM grouped WHERE size > 1 AND cities = 1),
    wrong_link AS (SELECT * FROM grouped WHERE size > 1 AND cities > 1)`;

async function duplicationAggregate(): Promise<DuplicationRate> {
  const [row] = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
    ${CLUSTER_CTE},
    coord_only AS (
      SELECT lat, lng, count(*) AS n, count(DISTINCT link) AS links
      FROM pts GROUP BY lat, lng
    )
    SELECT (SELECT count(*) FROM pts)::int AS in_scope,
           coalesce((SELECT sum(size - 1) FROM dupes), 0)::int AS excess,
           (SELECT count(*) FROM dupes)::int AS groups,
           coalesce((SELECT sum(size) FROM wrong_link), 0)::int AS wrong_link_rows,
           (SELECT count(*) FROM wrong_link)::int AS wrong_link_groups,
           coalesce((SELECT sum(n) FROM coord_only WHERE n > 1 AND links > 1), 0)::int AS same_coord_diff_link,
           (SELECT count(*) FROM "Warehouse" w WHERE NOT ${usableMapsLinkSql("w")})::int AS no_usable_link`);

  const inScope = num(row.in_scope);
  const excess = num(row.excess);

  return {
    inScope,
    duplicated: excess,
    groups: num(row.groups),
    percent: pct(excess, inScope),
    wrongLinkRows: num(row.wrong_link_rows),
    wrongLinkGroups: num(row.wrong_link_groups),
    sameCoordDifferentLink: num(row.same_coord_diff_link),
    noUsableLink: num(row.no_usable_link),
  };
}

/** Per-employee: rows duplicating another row of their own, plus their paste errors. */
async function duplicationByEmployee() {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
    ${CLUSTER_CTE},
    sized AS (
      SELECT p.email, p.lat, p.lng, p.link, g.size, g.cities
      FROM pts p
      JOIN grouped g ON g.lat = p.lat AND g.lng = p.lng AND g.link = p.link
      WHERE p.email IS NOT NULL
    ),
    own AS (
      SELECT email, lat, lng, link, count(*) AS mine
      FROM sized WHERE size > 1 AND cities = 1
      GROUP BY 1, 2, 3, 4
    )
    SELECT t.email,
           t.in_scope::int AS in_scope,
           coalesce(e.excess, 0)::int AS excess,
           coalesce(e.groups, 0)::int AS groups,
           coalesce(wl.n, 0)::int AS wrong_link_rows
    FROM (SELECT email, count(*) AS in_scope FROM sized GROUP BY 1) t
    LEFT JOIN (
      SELECT email, sum(mine - 1) AS excess, count(*) AS groups
      FROM own WHERE mine > 1 GROUP BY 1
    ) e ON e.email = t.email
    LEFT JOIN (
      SELECT email, count(*) AS n FROM sized WHERE size > 1 AND cities > 1 GROUP BY 1
    ) wl ON wl.email = t.email`);

  return new Map(
    rows.map((r) => {
      const inScope = num(r.in_scope);
      const excess = num(r.excess);
      return [
        String(r.email),
        {
          inScope,
          duplicated: excess,
          groups: num(r.groups),
          percent: pct(excess, inScope),
          wrongLinkRows: num(r.wrong_link_rows),
          wrongLinkGroups: 0,
          sameCoordDifferentLink: 0,
          noUsableLink: 0,
        } satisfies DuplicationRate,
      ];
    }),
  );
}

const EMPTY_DUPLICATION: DuplicationRate = {
  inScope: 0,
  duplicated: 0,
  groups: 0,
  percent: 0,
  wrongLinkRows: 0,
  wrongLinkGroups: 0,
  sameCoordDifferentLink: 0,
  noUsableLink: 0,
};

export const getCompanyMetrics = cache(async (): Promise<CompanyMetrics> => {
  const [northStar, warehouse, duplication, unattributed] = await Promise.all([
    getNorthStarMetric(),
    warehouseAggregate(),
    duplicationAggregate(),
    prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
      SELECT count(*)::int AS n FROM "Warehouse" w WHERE (${UPLOADER_EMAIL}) IS NULL`),
  ]);

  return {
    northStar,
    entries: warehouse.entries,
    fill: warehouse.fill,
    visibility: warehouse.visibility,
    duplication,
    unattributed: num(unattributed[0]?.n),
  };
});

export async function getMonthlyEntries(months = 12): Promise<MonthPoint[]> {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
    SELECT to_char(date_trunc('month', w."createdAt"), 'YYYY-MM') AS month,
           count(*)::int AS count
    FROM "Warehouse" w
    WHERE w."createdAt" >= date_trunc('month', now()) - interval '${months - 1} months'
    GROUP BY 1 ORDER BY 1`);

  return rows.map((r) => ({ month: String(r.month), count: num(r.count) }));
}

export async function getMonthlyEntriesFor(email: string, months = 12): Promise<MonthPoint[]> {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
    SELECT to_char(date_trunc('month', w."createdAt"), 'YYYY-MM') AS month,
           count(*)::int AS count
    FROM "Warehouse" w
    WHERE w."createdAt" >= date_trunc('month', now()) - interval '${months - 1} months'
      AND (${UPLOADER_EMAIL}) = '${email.replace(/'/g, "''")}'
    GROUP BY 1 ORDER BY 1`);

  return rows.map((r) => ({ month: String(r.month), count: num(r.count) }));
}

/** Per-field fill rate, ascending — drives the "fields under 60%" view. */
export const getFieldFillRates = cache(async (email?: string): Promise<FieldFill[]> => {
  const where = email ? `WHERE (${UPLOADER_EMAIL}) = '${email.replace(/'/g, "''")}'` : "";
  const selects = FILL_FIELDS.map(
    (f, i) => `count(*) FILTER (WHERE ${filledPredicate(f, "w")})::int AS f${i}`,
  ).join(", ");

  const [row] = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
    SELECT count(*)::int AS rows, ${selects} FROM "Warehouse" w ${where}`);

  const rows = num(row.rows);

  return FILL_FIELDS.map((field, i) => {
    const filled = num(row[`f${i}`]);
    return { column: field.column, filled, percent: pct(filled, rows) };
  }).sort((a, b) => a.percent - b.percent);
});

export const getActiveEmployees = cache(async (): Promise<Employee[]> => {
  const rows = await prisma.verifiedNumber.findMany({
    where: { is_active: true },
    orderBy: { name: "asc" },
  });

  return rows.map((r) => ({
    empID: r.empID ?? `vn-${r.id}`,
    name: r.name,
    email: r.email?.toLowerCase() ?? null,
    role: r.role,
    isActive: r.is_active,
    adminAccess: r.adminAccess,
    reviewerAccess: r.reviewerAccess,
  }));
});

export async function getEmployeeByEmpId(empID: string): Promise<Employee | null> {
  const row = await prisma.verifiedNumber.findFirst({ where: { empID } });
  if (!row) return null;

  return {
    empID: row.empID ?? `vn-${row.id}`,
    name: row.name,
    email: row.email?.toLowerCase() ?? null,
    role: row.role,
    isActive: row.is_active,
    adminAccess: row.adminAccess,
    reviewerAccess: row.reviewerAccess,
  };
}

export async function getEmployeeMetrics(employee: Employee): Promise<EmployeeMetrics> {
  // No email means nothing in Warehouse can be attributed to them.
  if (!employee.email) {
    return {
      employee,
      entries: { total: 0, last7: 0, previous7: 0, last30: 0, previous30: 0 },
      fill: { rows: 0, filledCells: 0, totalCells: 0, percent: 0 },
      visibility: { rows: 0, visible: 0, percent: 0 },
      duplication: EMPTY_DUPLICATION,
    };
  }

  const [warehouse, byEmployee] = await Promise.all([
    warehouseAggregate({ email: employee.email }),
    duplicationByEmployee(),
  ]);

  return {
    employee,
    ...warehouse,
    duplication: byEmployee.get(employee.email) ?? EMPTY_DUPLICATION,
  };
}

export async function getRecentUploads(email: string, limit = 8): Promise<RecentUpload[]> {
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
    SELECT w.id, w.city, w.state, w."warehouseType", w.visibility, w."createdAt",
           (${FILLED_CELLS})::int AS filled_cells
    FROM "Warehouse" w
    WHERE (${UPLOADER_EMAIL}) = '${email.replace(/'/g, "''")}'
    ORDER BY w."createdAt" DESC NULLS LAST
    LIMIT ${Math.max(1, Math.min(50, limit))}`);

  return rows.map((r) => ({
    id: num(r.id),
    city: String(r.city ?? "—"),
    state: String(r.state ?? "—"),
    warehouseType: String(r.warehouseType ?? "—"),
    visibility: Boolean(r.visibility),
    createdAt: r.createdAt ? new Date(r.createdAt as string).toISOString() : "",
    filledCells: num(r.filled_cells),
  }));
}

/**
 * All employees' warehouse metrics in two grouped queries rather than two per
 * person — the Supabase pooler runs in session mode with a low client ceiling,
 * so fanning out per-employee queries exhausts it during a build.
 */
export const getAllEmployeeMetrics = cache(async (): Promise<EmployeeMetrics[]> => {
  const [employees, aggregates, duplicates] = await Promise.all([
    getActiveEmployees(),
    prisma.$queryRawUnsafe<Record<string, unknown>[]>(`
      WITH resolved AS (
        SELECT w.*, (${UPLOADER_EMAIL}) AS __email FROM "Warehouse" w
      )
      SELECT w.__email AS email,
        count(*)::int AS rows,
        count(*) FILTER (WHERE w."createdAt" >= now() - interval '7 days')::int AS last7,
        count(*) FILTER (WHERE w."createdAt" >= now() - interval '14 days'
                           AND w."createdAt" <  now() - interval '7 days')::int AS previous7,
        count(*) FILTER (WHERE w."createdAt" >= now() - interval '30 days')::int AS last30,
        count(*) FILTER (WHERE w."createdAt" >= now() - interval '60 days'
                           AND w."createdAt" <  now() - interval '30 days')::int AS previous30,
        count(*) FILTER (WHERE w.visibility)::int AS visible,
        coalesce(sum(${FILLED_CELLS}), 0)::int AS filled_cells
      FROM resolved w
      WHERE w.__email IS NOT NULL
      GROUP BY w.__email`),
    duplicationByEmployee(),
  ]);

  const byEmail = new Map(aggregates.map((r) => [String(r.email), r]));

  return employees
    .map((employee) => {
      const a = employee.email ? byEmail.get(employee.email) : undefined;
      const rows = num(a?.rows);
      const filledCells = num(a?.filled_cells);

      return {
        employee,
        entries: {
          total: rows,
          last7: num(a?.last7),
          previous7: num(a?.previous7),
          last30: num(a?.last30),
          previous30: num(a?.previous30),
        },
        fill: {
          rows,
          filledCells,
          totalCells: rows * FILL_FIELD_COUNT,
          percent: pct(filledCells, rows * FILL_FIELD_COUNT),
        },
        visibility: { rows, visible: num(a?.visible), percent: pct(num(a?.visible), rows) },
        duplication:
          (employee.email ? duplicates.get(employee.email) : undefined) ?? EMPTY_DUPLICATION,
      };
    })
    .sort((a, b) => b.entries.total - a.entries.total);
});
