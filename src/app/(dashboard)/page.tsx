import Link from "next/link";
import { MonthlyColumns, StageFunnel, type FunnelRow } from "@/components/charts";
import {
  Avatar,
  Card,
  CardHeader,
  Hero,
  Meter,
  MeterTile,
  PageHeading,
  StatusNote,
} from "@/components/ui";
import {
  formatCount,
  formatDelta,
  formatPercent,
  statusVsCeiling,
  statusVsTarget,
  CEILING_LABEL,
} from "@/lib/format";
import {
  NSM_START,
  getAllEmployeeMetrics,
  getCompanyMetrics,
  getMonthlyEntries,
  getStageBreakdown,
} from "@/lib/metrics/queries";
import { TARGETS } from "@/lib/metrics/targets";

// The Twenty sync runs roughly every 30 minutes, so minute-fresh data buys nothing.
export const revalidate = 300;

const EXCLUDED_STAGES = new Set(["NEW_LEAD", "RFQ_NOT_RELEVANT", "DEAL_ON_HOLD", "DEAL_LOST"]);

function funnelRole(stage: string): FunnelRow["role"] {
  if (EXCLUDED_STAGES.has(stage)) return "excluded";
  if (stage === "RFQ_RECEIVED") return "gap";
  return "counted";
}

export default async function CompanyPage() {
  const [metrics, months, stages, employees] = await Promise.all([
    getCompanyMetrics(),
    getMonthlyEntries(),
    getStageBreakdown(),
    getAllEmployeeMetrics(),
  ]);

  const { northStar, entries, fill, visibility, duplication } = metrics;
  const contributors = employees.filter((e) => e.entries.total > 0);
  const nsmStatus = statusVsTarget(northStar.percent, TARGETS.northStar.target);

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Company-wide"
        title="Evaluation overview"
        description="Live figures from Supabase and the Twenty CRM mirror, measured against the agreed three-month targets."
        action={
          <Link
            href="/employees"
            className="rounded-md border border-line px-3 py-1.5 text-[13px] text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
          >
            Employee breakdown
          </Link>
        }
      />

      {/* The north star is the one metric that is company-only, so it leads. */}
      <Card>
        <CardHeader
          title="Proposal shared / RFQ received"
          subtitle={`North star · procurement fulfilment of proposal requests · deals created since ${NSM_START}`}
        />
        <div className="grid gap-8 px-5 py-5 lg:grid-cols-[18rem_1fr]">
          <div className="flex flex-col">
            <Hero
              value={northStar.percent.toFixed(1)}
              unit="%"
              caption={
                <div className="space-y-2.5">
                  <Meter percent={(northStar.percent / TARGETS.northStar.target) * 100} />
                  <div className="flex items-baseline justify-between gap-3 text-xs text-ink-3">
                    <StatusNote status={nsmStatus} />
                    <span>target {TARGETS.northStar.target}%</span>
                  </div>
                </div>
              }
            />

            <dl className="mt-6 space-y-2 border-t border-line pt-4 text-xs">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-3">Proposal shared or beyond</dt>
                <dd className="text-ink [font-variant-numeric:tabular-nums]">{northStar.numerator}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-3">Still at RFQ received</dt>
                <dd className="text-ink [font-variant-numeric:tabular-nums]">{northStar.rfqReceived}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-line pt-2">
                <dt className="text-ink-3">In scope</dt>
                <dd className="text-ink [font-variant-numeric:tabular-nums]">{northStar.denominator}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-3">Excluded stages</dt>
                <dd className="text-ink-2 [font-variant-numeric:tabular-nums]">{northStar.excluded}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-3">All deals</dt>
                <dd className="text-ink-2 [font-variant-numeric:tabular-nums]">{northStar.allDeals}</dd>
              </div>
            </dl>

            <p className="mt-4 text-xs leading-relaxed text-ink-3">
              Baseline {formatPercent(TARGETS.northStar.baseline)}. New lead, RFQ not relevant, deal
              on hold and deal lost are excluded from both sides of the ratio.
            </p>
          </div>

          <div className="min-w-0 self-start rounded-md border border-line">
            <StageFunnel
              rows={stages.map((s) => ({ stage: s.stage, deals: s.deals, role: funnelRole(s.stage) }))}
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MeterTile
          label="Entries, last 30 days"
          value={formatCount(entries.last30)}
          target={formatCount(TARGETS.entriesPerMonth.target)}
          meter={(entries.last30 / TARGETS.entriesPerMonth.target) * 100}
          status={statusVsTarget(entries.last30, TARGETS.entriesPerMonth.target)}
          footnote={`${formatDelta(entries.last30, entries.previous30)} vs. prior 30 days`}
        />
        <MeterTile
          label="Fill rate"
          value={fill.percent.toFixed(1)}
          unit="%"
          target={`${TARGETS.fillRate.target}%`}
          meter={(fill.percent / TARGETS.fillRate.target) * 100}
          status={statusVsTarget(fill.percent, TARGETS.fillRate.target)}
          footnote={`${formatCount(fill.filledCells)} of ${formatCount(fill.totalCells)} cells, 74 fields`}
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
          label="Duplication"
          value={duplication.percent.toFixed(1)}
          unit="%"
          target={`under ${TARGETS.duplication.target}%`}
          meter={Math.min(100, (duplication.percent / TARGETS.duplication.target) * 100)}
          status={statusVsCeiling(duplication.percent, TARGETS.duplication.target)}
          statusLabel={CEILING_LABEL[statusVsCeiling(duplication.percent, TARGETS.duplication.target)]}
          footnote={`${duplication.duplicated} redundant rows across ${duplication.groups} matched pins`}
        />
      </div>

      <Card>
        <CardHeader
          title="Entries created per month"
          subtitle="Warehouse rows by creation month. The current month is partial."
          action={`${entries.last7} in the last 7 days (${formatDelta(entries.last7, entries.previous7)})`}
        />
        <MonthlyColumns points={months} target={TARGETS.entriesPerMonth.target} />
      </Card>

      <Card>
        <CardHeader
          title="Employee contribution"
          subtitle="Active employees with attributed warehouse entries"
          action={
            metrics.unattributed > 0
              ? `${metrics.unattributed} rows unattributed`
              : "all rows attributed"
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] text-[13px]">
            <thead>
              <tr className="border-b border-line text-xs text-ink-3">
                <th scope="col" className="px-5 py-2.5 text-left font-medium">Employee</th>
                <th scope="col" className="px-5 py-2.5 text-right font-medium">Entries</th>
                <th scope="col" className="px-5 py-2.5 text-right font-medium">Last 30d</th>
                <th scope="col" className="px-5 py-2.5 text-right font-medium">Fill</th>
                <th scope="col" className="px-5 py-2.5 text-right font-medium">Visible</th>
                <th scope="col" className="px-5 py-2.5 text-right font-medium">Duplicated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {contributors.map(({ employee, entries: e, fill: f, visibility: v, duplication: d }) => (
                <tr key={employee.empID} className="transition-colors hover:bg-inset/60">
                  <td className="px-5 py-2.5">
                    <Link href={`/employees/${employee.empID}`} className="flex items-center gap-2.5">
                      <Avatar name={employee.name} size="sm" />
                      <span className="truncate text-ink">{employee.name}</span>
                    </Link>
                  </td>
                  <td className="px-5 py-2.5 text-right text-ink [font-variant-numeric:tabular-nums]">
                    {formatCount(e.total)}
                  </td>
                  <td className="px-5 py-2.5 text-right text-ink-2 [font-variant-numeric:tabular-nums]">
                    {e.last30}
                  </td>
                  <td className="px-5 py-2.5 text-right text-ink-2 [font-variant-numeric:tabular-nums]">
                    {formatPercent(f.percent)}
                  </td>
                  <td className="px-5 py-2.5 text-right [font-variant-numeric:tabular-nums]">
                    <span className={v.percent < 90 ? "text-warn" : "text-ink-2"}>
                      {formatPercent(v.percent)}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-right [font-variant-numeric:tabular-nums]">
                    <span className={d.percent > 2 * TARGETS.duplication.target ? "text-warn" : "text-ink-2"}>
                      {formatPercent(d.percent)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-line px-5 py-3 text-xs leading-relaxed text-ink-3">
          Visible and duplicated are marked when they miss their thresholds ({"<"}90% visible, over{" "}
          {2 * TARGETS.duplication.target}% duplicated). A duplicate needs the same coordinates{" "}
          <em className="not-italic text-ink-2">and</em> the same Google Maps link, and only counts
          against the person who uploaded both — nobody is charged for a colleague posting the same
          site.
        </p>
      </Card>
    </div>
  );
}
