import { BarChart, type ChartDatum } from '@harness-sample/ui'
import type { ReportBreakdownResponse } from '@harness-sample/shared'
import { BUCKET_LABELS, BUCKET_TONES, DIMENSION_LABELS } from '../reportViews'

interface ReportBreakdownChartProps {
  breakdown: ReportBreakdownResponse | undefined
  isLoading: boolean
}

/**
 * A breakdown of the range, drawn.
 *
 * This is where the domain meets the chart: a bucket key becomes a label and a
 * tone here, so `BarChart` never learns what a ticket status is — the same
 * arrangement as `TicketStatusBadge` and `Badge`.
 */
export function ReportBreakdownChart({ breakdown, isLoading }: ReportBreakdownChartProps) {
  const dimensionLabel = breakdown ? DIMENSION_LABELS[breakdown.dimension] : 'Status'

  /**
   * A range with nothing in it still comes back with a bucket per status — the
   * endpoint keeps the empty ones so the chart does not change shape between
   * loads. Emptiness is therefore the range's total, not the bucket count, and
   * a chart of four zero-length bars is not what to show for it.
   */
  const isEmpty = (breakdown?.total ?? 0) === 0

  const data: readonly ChartDatum[] = isEmpty
    ? []
    : (breakdown?.buckets.map((bucket) => ({
        id: bucket.key,
        label: BUCKET_LABELS[bucket.key],
        value: bucket.value,
        tone: BUCKET_TONES[bucket.key],
      })) ?? [])

  return (
    <BarChart
      caption={`Tickets by ${dimensionLabel.toLowerCase()}`}
      categoryLabel={dimensionLabel}
      valueLabel="Tickets"
      data={data}
      isLoading={isLoading}
      emptyMessage="No tickets were raised in this range."
    />
  )
}
