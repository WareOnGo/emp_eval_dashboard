import Link from "next/link";
import { notFound } from "next/navigation";
import { MonthlyColumns, ValueBars } from "@/components/charts";
import {
  Avatar,
  Card,
  CardHeader,
  EmptyState,
  Hero,
  MeterTile,
  StatusNote,
} from "@/components/ui";
import {
  CEILING_LABEL,
  formatCount,
  formatDate,
  formatDelta,
  formatPercent,
  humaniseField,
  statusVsCeiling,
  statusVsTarget,
} from "@/lib/format";
import { FILL_FIELD_COUNT } from "@/lib/metrics/fields";
import {
  getEmployeeByEmpId,
  getEmployeeMetrics,
  getFieldFillRates,
  getMonthlyEntriesFor,
  getRecentUploads,
} from "@/lib/metrics/queries";
import { TARGETS, WEAK_FIELD_THRESHOLD } from "@/lib/metrics/targets";

export const revalidate = 300;

export async function generateMetadata({ params }: PageProps<"/employees/[id]">) {
  const { id } = await params;
  const employee = await getEmployeeByEmpId(id);
  return { title: employee?.name ?? "Employee not found" };
}

export default async function EmployeePage({ params }: PageProps<"/employees/[id]">) {
  const { id } = await params;
  const employee = await getEmployeeByEmpId(id);
  if (!employee) notFound();

  const metrics = await getEmployeeMetrics(employee);
  const { entries, fill, visibility, duplication } = metrics;

  // Only worth the extra queries when something is actually attributed.
  const [months, fields, recent] =
    employee.email && entries.total > 0
      ? await Promise.all([
          getMonthlyEntriesFor(employee.email),
          getFieldFillRates(employee.email),
          getRecentUploads(employee.email),
        ])
      : [[], [], []];

  const weakest = fields.filter((f) => f.percent < WEAK_FIELD_THRESHOLD);
  const dupStatus = statusVsCeiling(duplication.percent, TARGETS.duplication.target);

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-xs text-ink-3">
        <Link href="/employees" className="transition-colors hover:text-ink">
          Employees
        </Link>
        <span aria-hidden>/</span>
        <span className="text-ink-2">{employee.name}</span>
      </nav>

      <Card className="px-5 py-5">
        <div className="flex flex-wrap items-start justify-between gap-8">
          <div className="flex items-start gap-4">
            <Avatar name={employee.name} size="lg" />
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-ink">{employee.name}</h1>
              <p className="mt-1 text-xs text-ink-3">
                {employee.isActive ? "Active" : "Inactive"}
                {employee.adminAccess ? " · admin" : ""}
                {employee.reviewerAccess ? " · reviewer" : ""}
              </p>
              <dl className="mt-4 grid gap-x-8 gap-y-1.5 text-xs sm:grid-cols-2">
                <div className="flex gap-2">
                  <dt className="text-ink-3">Emp ID</dt>
                  <dd className="font-mono text-ink-2">{employee.empID}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-ink-3">Email</dt>
                  <dd className="truncate text-ink-2">{employee.email ?? "—"}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="text-ink-3">Role</dt>
                  <dd className="text-ink-2">{employee.role.toLowerCase()}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div>
            <p className="text-xs text-ink-3">Attributed entries</p>
            <div className="mt-2">
              <Hero
                value={formatCount(entries.total)}
                caption={
                  <p className="text-xs text-ink-3">
                    {entries.last7} in the last 7 days ({formatDelta(entries.last7, entries.previous7)})
                  </p>
                }
              />
            </div>
          </div>
        </div>
      </Card>

      {!employee.email ? (
        <Card>
          <CardHeader title="Not attributable" subtitle="No email on the VerifiedNumber roster" />
          <EmptyState>
            Warehouse rows are attributed by email, so nothing can be matched to this person until
            one is set.
          </EmptyState>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <MeterTile
              label="Fill rate"
              value={fill.percent.toFixed(1)}
              unit="%"
              target={`${TARGETS.fillRate.target}%`}
              meter={(fill.percent / TARGETS.fillRate.target) * 100}
              status={statusVsTarget(fill.percent, TARGETS.fillRate.target)}
              footnote={`${formatCount(fill.filledCells)} of ${formatCount(fill.totalCells)} cells`}
            />
            <MeterTile
              label="Visible on website"
              value={visibility.percent.toFixed(1)}
              unit="%"
              target={`${TARGETS.visibility.target}%`}
              meter={(visibility.percent / TARGETS.visibility.target) * 100}
              status={statusVsTarget(visibility.percent, TARGETS.visibility.target)}
              footnote={`${formatCount(visibility.visible)} of ${formatCount(visibility.rows)} entries`}
            />
            <MeterTile
              label="Duplicated coordinates"
              value={duplication.percent.toFixed(1)}
              unit="%"
              target={`under ${TARGETS.duplication.target}%`}
              meter={Math.min(100, (duplication.percent / TARGETS.duplication.target) * 100)}
              status={dupStatus}
              statusLabel={CEILING_LABEL[dupStatus]}
              footnote={`${duplication.duplicated} of ${formatCount(duplication.geocoded)} geocoded rows`}
            />
          </div>

          <Card>
            <CardHeader
              title="Entries created per month"
              subtitle="Attributed warehouse rows. The current month is partial."
            />
            <MonthlyColumns points={months} />
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader
                title="Weakest fields"
                subtitle={`${weakest.length} of ${FILL_FIELD_COUNT} fields under ${WEAK_FIELD_THRESHOLD}% on their entries`}
                action="lowest 12"
              />
              {weakest.length === 0 ? (
                <EmptyState>No field falls under {WEAK_FIELD_THRESHOLD}%.</EmptyState>
              ) : (
                <ValueBars
                  rows={weakest.slice(0, 12).map((f) => ({
                    label: humaniseField(f.column),
                    value: f.percent,
                  }))}
                />
              )}
            </Card>

            <Card>
              <CardHeader title="Recent uploads" subtitle="Newest first" />
              {recent.length === 0 ? (
                <EmptyState>No uploads found.</EmptyState>
              ) : (
                <ul className="divide-y divide-line">
                  {recent.map((row) => (
                    <li key={row.id} className="flex items-baseline gap-3 px-5 py-2.5">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] text-ink">
                          {row.city}, {row.state}
                        </span>
                        <span className="block truncate text-xs text-ink-3">
                          {row.warehouseType} · {formatDate(row.createdAt)}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-ink-2 [font-variant-numeric:tabular-nums]">
                        {formatPercent((100 * row.filledCells) / FILL_FIELD_COUNT, 0)} filled
                      </span>
                      {row.visibility ? (
                        <span className="w-12 shrink-0 text-right text-xs text-ink-3">visible</span>
                      ) : (
                        <span className="w-12 shrink-0 text-right">
                          <StatusNote status="warn" label="hidden" />
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
