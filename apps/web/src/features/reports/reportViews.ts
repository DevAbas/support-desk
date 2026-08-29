import type { ChartTone } from '@harness-sample/ui'
import {
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  type ReportBucketKey,
  type ReportDimension,
} from '@harness-sample/shared'

/**
 * How a report is presented: the three views, and the domain-to-presentation
 * mapping the charts need.
 *
 * The same separation as `TicketStatusBadge`. A `ChartTone` is an appearance and
 * a ticket status is a domain value; the design system never learns what a
 * ticket is, so the mapping between the two lives here. The tones match the
 * badges on the ticket screens on purpose: resolved is green in both places.
 */

export const REPORT_VIEWS = ['status', 'priority', 'assignee'] as const

export type ReportView = (typeof REPORT_VIEWS)[number]

export const REPORT_VIEW_LABELS: Record<ReportView, string> = {
  status: 'By status',
  priority: 'By priority',
  assignee: 'By assignee',
}

/** What the breakdown endpoint is asked for. The assignee view is a table. */
export function toDimension(view: Exclude<ReportView, 'assignee'>): ReportDimension {
  return view
}

/** The two label tables, joined: the bucket unions they cover are disjoint. */
export const BUCKET_LABELS: Record<ReportBucketKey, string> = {
  ...TICKET_STATUS_LABELS,
  ...TICKET_PRIORITY_LABELS,
}

// Keyed by the union, so a status added to the domain is a compile error rather
// than a bar drawn in whatever colour is left over.
export const BUCKET_TONES: Record<ReportBucketKey, ChartTone> = {
  open: 'info',
  pending: 'warning',
  resolved: 'success',
  closed: 'neutral',
  low: 'neutral',
  medium: 'info',
  high: 'danger',
}

/** What the value column of a breakdown counts, per dimension. */
export const DIMENSION_LABELS: Record<ReportDimension, string> = {
  status: 'Status',
  priority: 'Priority',
}

/** Narrows the value a tab strip reports back to one of the three views. */
export function isReportView(value: string): value is ReportView {
  return (REPORT_VIEWS as readonly string[]).includes(value)
}
