import type { Metadata } from "next";
import Link from "next/link";
import { Avatar, Card, CardHeader, EmptyState, Meter, PageHeading } from "@/components/ui";
import { formatCount, formatDelta, formatPercent } from "@/lib/format";
import { getAllEmployeeMetrics } from "@/lib/metrics/queries";
import { TARGETS } from "@/lib/metrics/targets";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Employees",
};

export default async function EmployeesPage() {
  const all = await getAllEmployeeMetrics();
  const contributing = all.filter((e) => e.entries.total > 0);
  const idle = all.filter((e) => e.entries.total === 0);

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Employee-wise"
        title="Employees"
        description="Active employees only. Warehouse work is attributed through the uploader alias map, so pre-April entries recorded under names and initials still count."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {contributing.map(({ employee, entries, fill, visibility, duplication }) => (
          <Card key={employee.empID}>
            <Link
              href={`/employees/${employee.empID}`}
              className="flex items-center gap-2.5 border-b border-line px-5 py-3.5 transition-colors hover:bg-inset/60"
            >
              <Avatar name={employee.name} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-ink">
                  {employee.name}
                </span>
                <span className="block truncate text-xs text-ink-3">
                  {employee.email ?? "no email on roster"}
                </span>
              </span>
            </Link>

            <div className="flex items-baseline justify-between gap-4 px-5 pt-4">
              <div>
                <p className="text-xs text-ink-3">Entries</p>
                <p className="mt-1 text-[28px] font-semibold leading-none tracking-tight text-ink">
                  {formatCount(entries.total)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-ink-3">Last 30 days</p>
                <p className="mt-1 text-[13px] text-ink [font-variant-numeric:tabular-nums]">
                  {entries.last30}
                  <span className="ml-2 text-xs text-ink-3">
                    {formatDelta(entries.last30, entries.previous30)}
                  </span>
                </p>
              </div>
            </div>

            <dl className="mt-5 space-y-3 px-5 pb-5">
              <div>
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <dt className="text-ink-3">Fill rate</dt>
                  <dd className="text-ink-2 [font-variant-numeric:tabular-nums]">
                    {formatPercent(fill.percent)}
                    <span className="ml-1.5 text-ink-3">/ {TARGETS.fillRate.target}%</span>
                  </dd>
                </div>
                <div className="mt-1.5">
                  <Meter percent={(fill.percent / TARGETS.fillRate.target) * 100} />
                </div>
              </div>
              <div>
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <dt className="text-ink-3">Visible</dt>
                  <dd className="text-ink-2 [font-variant-numeric:tabular-nums]">
                    {formatPercent(visibility.percent)}
                    <span className="ml-1.5 text-ink-3">/ {TARGETS.visibility.target}%</span>
                  </dd>
                </div>
                <div className="mt-1.5">
                  <Meter percent={(visibility.percent / TARGETS.visibility.target) * 100} />
                </div>
              </div>
              <div className="flex items-baseline justify-between gap-3 border-t border-line pt-3 text-xs">
                <dt className="text-ink-3">Duplicated coordinates</dt>
                <dd
                  className={`[font-variant-numeric:tabular-nums] ${
                    duplication.percent > 2 * TARGETS.duplication.target ? "text-warn" : "text-ink-2"
                  }`}
                >
                  {formatPercent(duplication.percent)}
                </dd>
              </div>
            </dl>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader
          title="No attributed entries"
          subtitle="Active employees with nothing matched in the Warehouse table"
        />
        {idle.length === 0 ? (
          <EmptyState>Everyone active has attributed entries.</EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {idle.map(({ employee }) => (
              <li key={employee.empID}>
                <Link
                  href={`/employees/${employee.empID}`}
                  className="flex items-center gap-2.5 px-5 py-2.5 transition-colors hover:bg-inset/60"
                >
                  <Avatar name={employee.name} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-ink">
                    {employee.name}
                  </span>
                  <span className="shrink-0 text-xs text-ink-3">
                    {employee.email ?? "no email on roster — cannot be attributed"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
