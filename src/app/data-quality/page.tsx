import type { Metadata } from "next";
import { ValueBars } from "@/components/charts";
import { Card, CardHeader, Hero, Meter, MeterTile, PageHeading, StatusNote } from "@/components/ui";
import {
  CEILING_LABEL,
  formatCount,
  formatPercent,
  humaniseField,
  statusVsCeiling,
  statusVsTarget,
} from "@/lib/format";
import { EXCLUDED_COLUMNS, FILL_FIELD_COUNT } from "@/lib/metrics/fields";
import { getCompanyMetrics, getFieldFillRates } from "@/lib/metrics/queries";
import { TARGETS, WEAK_FIELD_THRESHOLD } from "@/lib/metrics/targets";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Data quality",
};

export default async function DataQualityPage() {
  const [metrics, fields] = await Promise.all([getCompanyMetrics(), getFieldFillRates()]);
  const { fill, visibility, duplication } = metrics;
  const weak = fields.filter((f) => f.percent < WEAK_FIELD_THRESHOLD);
  const fillStatus = statusVsTarget(fill.percent, TARGETS.fillRate.target);
  const dupStatus = statusVsCeiling(duplication.percent, TARGETS.duplication.target);

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Company-wide"
        title="Data quality"
        description={`Field-level completeness across the ${FILL_FIELD_COUNT} Warehouse fields counted by the fill-rate metric.`}
      />

      <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
        {/* Same internal rhythm as MeterTile so all three meters sit on one line. */}
        <Card className="flex flex-col px-5 py-5">
          <p className="text-xs text-ink-3">Fill rate, all entries</p>
          <Hero value={fill.percent.toFixed(1)} unit="%" />
          <p className="mt-2.5 text-xs leading-relaxed text-ink-3">
            {formatCount(fill.filledCells)} filled cells of {formatCount(fill.totalCells)} across{" "}
            {formatCount(fill.rows)} entries. Baseline {formatPercent(TARGETS.fillRate.baseline)}.
          </p>
          <div className="mt-4 flex-1" />
          <div className="mt-3">
            <Meter percent={(fill.percent / TARGETS.fillRate.target) * 100} />
            <div className="mt-2 flex items-baseline justify-between gap-3 text-xs text-ink-3">
              <StatusNote status={fillStatus} />
              <span>target {TARGETS.fillRate.target}%</span>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <MeterTile
            label="Visible on website"
            value={visibility.percent.toFixed(1)}
            unit="%"
            target={`${TARGETS.visibility.target}%`}
            meter={(visibility.percent / TARGETS.visibility.target) * 100}
            status={statusVsTarget(visibility.percent, TARGETS.visibility.target)}
            footnote={`${formatCount(visibility.visible)} of ${formatCount(visibility.rows)} entries exposed`}
          />
          <MeterTile
            label="Duplicated coordinates"
            value={duplication.percent.toFixed(1)}
            unit="%"
            target={`under ${TARGETS.duplication.target}%`}
            meter={Math.min(100, (duplication.percent / TARGETS.duplication.target) * 100)}
            status={dupStatus}
            statusLabel={CEILING_LABEL[dupStatus]}
            footnote={`${duplication.duplicated} redundant rows across ${duplication.clusters} clusters, of ${formatCount(duplication.geocoded)} geocoded`}
          />
        </div>
      </div>

      <Card>
        <CardHeader
          title="Suspected bad coordinates"
          subtitle="One exact coordinate shared by entries that name different cities"
          action={`${duplication.suspectClusters} coordinates`}
        />
        <p className="px-5 py-4 text-[13px] leading-relaxed text-ink-2">
          <span className="text-ink">{duplication.suspectRows} entries</span> sit on{" "}
          {duplication.suspectClusters} coordinates that are claimed by more than one city — for
          example one point in Andhra Pradesh carrying entries labelled Hyderabad, Mumbai and
          Vijayawada. These are wrong coordinates rather than duplicated warehouses, so they are
          excluded from the duplication figure and listed here instead. They need re-geocoding, not
          de-duplicating.
        </p>
      </Card>

      <Card>
        <CardHeader
          title={`Fields under ${WEAK_FIELD_THRESHOLD}%`}
          subtitle="Where the fill-rate metric has the most headroom"
          action={`${weak.length} of ${FILL_FIELD_COUNT} fields`}
        />
        <ValueBars
          rows={weak.map((f) => ({
            label: humaniseField(f.column),
            value: f.percent,
            caption: `${formatCount(f.filled)} rows`,
          }))}
        />
      </Card>

      <Card>
        <CardHeader title="All fields" subtitle="Ascending by fill rate" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-[13px]">
            <thead>
              <tr className="border-b border-line text-xs text-ink-3">
                <th scope="col" className="px-5 py-2.5 text-left font-medium">Field</th>
                <th scope="col" className="px-5 py-2.5 text-left font-medium">Column</th>
                <th scope="col" className="px-5 py-2.5 text-right font-medium">Rows filled</th>
                <th scope="col" className="px-5 py-2.5 text-right font-medium">Fill</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {fields.map((field) => (
                <tr key={field.column} className="transition-colors hover:bg-inset/60">
                  <td className="px-5 py-2 text-ink">{humaniseField(field.column)}</td>
                  <td className="px-5 py-2 font-mono text-xs text-ink-3">{field.column}</td>
                  <td className="px-5 py-2 text-right text-ink-2 [font-variant-numeric:tabular-nums]">
                    {formatCount(field.filled)}
                  </td>
                  <td className="px-5 py-2 text-right [font-variant-numeric:tabular-nums]">
                    <span className={field.percent < WEAK_FIELD_THRESHOLD ? "text-ink-2" : "text-ink"}>
                      {formatPercent(field.percent)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-xs leading-relaxed text-ink-3">
        Excluded as system or derived columns:{" "}
        <span className="font-mono text-ink-2">{EXCLUDED_COLUMNS.join(", ")}</span>. A text field
        counts as filled only when non-blank; arrays and JSON must be non-empty. WarehouseData
        columns are not counted — including them moves the figure to 34.3% and breaks continuity with
        the agreed baseline.
      </p>
    </div>
  );
}
