import { StatCard } from '@support-desk/ui'
import type { ReportSummaryResponse } from '@support-desk/shared'
import { rangeLengthInDays } from '../reportRanges'
import { formatCount, formatOptionalDuration, toStatChange } from '../reportFormat'

interface ReportSummaryCardsProps {
  summary: ReportSummaryResponse | undefined
  isLoading: boolean
}

/**
 * The four headline figures.
 *
 * Which direction counts as good news is decided here, not by `StatCard`: more
 * tickets raised is not an improvement, more resolved is, and a queue taking
 * longer to clear is worse. The card draws the arrow it is given.
 */
export function ReportSummaryCards({ summary, isLoading }: ReportSummaryCardsProps) {
  const comparison =
    summary === undefined
      ? 'vs previous period'
      : `vs previous ${String(rangeLengthInDays(summary.previousRange))} days`

  return (
    // Named, so the four figures are one landmark rather than four loose
    // numbers — and so "Resolved" here is distinguishable from the status of the
    // same name in the breakdown below it.
    <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Tickets raised"
        value={formatCount(summary?.totalTickets.value ?? null)}
        change={summary && toStatChange(summary.totalTickets, 'neutral', comparison)}
        isLoading={isLoading}
      />
      <StatCard
        label="Resolved"
        value={formatCount(summary?.resolvedTickets.value ?? null)}
        change={summary && toStatChange(summary.resolvedTickets, 'more-is-better', comparison)}
        isLoading={isLoading}
      />
      <StatCard
        label="Median time to resolution"
        value={formatOptionalDuration(summary?.medianResolutionMs.value ?? null)}
        change={summary && toStatChange(summary.medianResolutionMs, 'less-is-better', comparison)}
        isLoading={isLoading}
      />
      <StatCard
        label="Currently open"
        value={formatCount(summary?.openTickets.value ?? null)}
        change={summary && toStatChange(summary.openTickets, 'less-is-better', comparison)}
        isLoading={isLoading}
      />
    </section>
  )
}
