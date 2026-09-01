import {
  TICKET_STATUSES,
  TICKET_STATUS_LABELS,
  type ReportAssigneesResponse,
  type ReportBreakdownResponse,
  type ReportRange,
} from '@support-desk/shared'
import { CSV_MIME_TYPE, toCsv } from '@/lib/csv'
import { BUCKET_LABELS, DIMENSION_LABELS, type ReportView } from './reportViews'

/**
 * The three views, as CSV.
 *
 * Each export is the view on screen rather than the whole report, which is what
 * the control next to it says it is. There is no second request behind any of
 * them: the figures are already loaded, because the aggregation happened on the
 * server and what arrived is what the file needs.
 */

export const REPORTS_CSV_MIME_TYPE = CSV_MIME_TYPE

const shareFormatter = new Intl.NumberFormat('en-GB', {
  style: 'percent',
  maximumFractionDigits: 1,
})

export function breakdownToCsv(breakdown: ReportBreakdownResponse): string {
  const header = [DIMENSION_LABELS[breakdown.dimension], 'Tickets', 'Share']

  const rows = breakdown.buckets.map((bucket) => [
    BUCKET_LABELS[bucket.key],
    String(bucket.value),
    shareFormatter.format(bucket.share),
  ])

  return toCsv([header, ...rows])
}

/** One column per status, in domain order, so the file matches the table. */
export function assigneesToCsv(assignees: ReportAssigneesResponse): string {
  const header = [
    'Assignee',
    ...TICKET_STATUSES.map((status) => TICKET_STATUS_LABELS[status]),
    'Total',
  ]

  const rows = assignees.rows.map((row) => [
    row.assignee,
    ...TICKET_STATUSES.map((status) => String(row.byStatus[status])),
    String(row.total),
  ])

  return toCsv([header, ...rows])
}

/** e.g. `report-status-2026-07-01-to-2026-08-25.csv`. */
export function reportCsvFilename(view: ReportView, range: ReportRange): string {
  return `report-${view}-${range.from}-to-${range.to}.csv`
}
