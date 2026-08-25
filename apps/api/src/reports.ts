import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type ReportAssigneeRow,
  type ReportAssigneesResponse,
  type ReportBreakdownQuery,
  type ReportBreakdownResponse,
  type ReportBucket,
  type ReportBucketKey,
  type ReportMetric,
  type ReportRange,
  type ReportSummaryResponse,
  type Ticket,
  type TicketStatus,
} from '@harness-sample/shared'

/**
 * The reporting aggregation.
 *
 * These are pure functions over a snapshot of the queue, which is what lets the
 * numbers be tested directly rather than only through a route. The client never
 * does any of this: it asks for a range and is handed figures.
 *
 * Two decisions are worth stating, because every number below rests on them.
 *
 * **A range selects tickets by when they were created.** All four summary
 * figures describe the same cohort — the tickets raised in the range — so
 * "resolved" means "raised in this range and since resolved", not "resolved
 * during this range". One cohort is what makes the four figures, the charts and
 * the assignee table describe the same set of tickets rather than three
 * overlapping ones.
 *
 * **The queue has no resolution timestamp.** A `Ticket` records when it was
 * created and what state it is in now, and nothing records when it stopped
 * being open. Rather than invent a field the domain does not have, the last
 * comment on a resolved or closed ticket stands in for when it was resolved,
 * which is the closest thing the data holds to that moment. A resolved ticket
 * nobody commented on has no resolution time and is left out of the median
 * rather than counted as instant.
 */

const DAY_IN_MS = 24 * 60 * 60 * 1000

/** Statuses that mean the ticket is done with. */
const CLOSED_STATUSES: readonly TicketStatus[] = ['resolved', 'closed']

interface Window {
  startMs: number
  endMs: number
}

/**
 * Both ends inclusive, read in UTC: `from` from the first millisecond of its
 * day, `to` through the last of its own.
 */
function toWindow(range: ReportRange): Window {
  return {
    startMs: Date.parse(`${range.from}T00:00:00.000Z`),
    endMs: Date.parse(`${range.to}T23:59:59.999Z`),
  }
}

function toIsoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/**
 * The equally long span ending the day before the range starts, so the two
 * never overlap and a "last 30 days" figure is compared with the 30 before it.
 */
export function previousRange(range: ReportRange): ReportRange {
  const startMs = Date.parse(`${range.from}T00:00:00.000Z`)
  const endMs = Date.parse(`${range.to}T00:00:00.000Z`)
  const spanMs = endMs - startMs + DAY_IN_MS

  return {
    from: toIsoDate(startMs - spanMs),
    to: toIsoDate(startMs - DAY_IN_MS),
  }
}

function isWithin(isoTimestamp: string, window: Window): boolean {
  const ms = Date.parse(isoTimestamp)

  return ms >= window.startMs && ms <= window.endMs
}

/** The tickets raised in the range. Every figure in this file counts these. */
function cohort(tickets: readonly Ticket[], range: ReportRange): readonly Ticket[] {
  const window = toWindow(range)

  return tickets.filter((ticket) => isWithin(ticket.createdAt, window))
}

function isResolved(ticket: Ticket): boolean {
  return CLOSED_STATUSES.includes(ticket.status)
}

/**
 * How long the ticket took to resolve, or undefined when that cannot be known:
 * it is still open, or it was closed without anyone commenting. See the note at
 * the top of the file on why the last comment stands in for the resolution.
 */
function resolutionMs(ticket: Ticket): number | undefined {
  if (!isResolved(ticket)) {
    return undefined
  }

  const lastComment = ticket.comments.at(-1)

  if (!lastComment) {
    return undefined
  }

  const elapsed = Date.parse(lastComment.createdAt) - Date.parse(ticket.createdAt)

  // A comment predating the ticket would be nonsense; treat it as unknown
  // rather than let a negative duration into the median.
  return elapsed >= 0 ? elapsed : undefined
}

/** Null for an empty sample: no tickets resolved is not a duration of zero. */
function median(values: readonly number[]): number | null {
  if (values.length === 0) {
    return null
  }

  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)

  const value =
    sorted.length % 2 === 1
      ? (sorted[middle] as number)
      : ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2

  return Math.round(value)
}

/**
 * Pairs a figure with the same figure over the previous period. The change is
 * left null whenever there is nothing to divide by: growth from zero is not a
 * percentage, and rendering it as one would invent a number.
 */
function toMetric(value: number | null, previousValue: number | null): ReportMetric {
  const canCompare = value !== null && previousValue !== null && previousValue !== 0

  return {
    value,
    previousValue,
    changeRatio: canCompare ? (value - previousValue) / previousValue : null,
  }
}

function countOpen(tickets: readonly Ticket[]): number {
  return tickets.filter((ticket) => !isResolved(ticket)).length
}

function countResolved(tickets: readonly Ticket[]): number {
  return tickets.filter(isResolved).length
}

function medianResolution(tickets: readonly Ticket[]): number | null {
  return median(
    tickets
      .map(resolutionMs)
      .filter((elapsed): elapsed is number => elapsed !== undefined),
  )
}

export function buildSummary(
  tickets: readonly Ticket[],
  range: ReportRange,
): ReportSummaryResponse {
  const previous = previousRange(range)
  const current = cohort(tickets, range)
  const before = cohort(tickets, previous)

  return {
    range,
    previousRange: previous,
    totalTickets: toMetric(current.length, before.length),
    resolvedTickets: toMetric(countResolved(current), countResolved(before)),
    medianResolutionMs: toMetric(medianResolution(current), medianResolution(before)),
    openTickets: toMetric(countOpen(current), countOpen(before)),
  }
}

/** The bucket keys of a dimension, in the order the domain declares them. */
function bucketKeys(dimension: ReportBreakdownQuery['dimension']): readonly ReportBucketKey[] {
  return dimension === 'status' ? TICKET_STATUSES : TICKET_PRIORITIES
}

function bucketKeyOf(ticket: Ticket, dimension: ReportBreakdownQuery['dimension']): ReportBucketKey {
  return dimension === 'status' ? ticket.status : ticket.priority
}

/**
 * Every bucket of the dimension is returned, including the empty ones: a status
 * nothing landed in is a fact about the range, and a chart that simply omits it
 * changes shape between loads for no visible reason.
 */
export function buildBreakdown(
  tickets: readonly Ticket[],
  { dimension, ...range }: ReportBreakdownQuery,
): ReportBreakdownResponse {
  const current = cohort(tickets, range)

  const buckets: ReportBucket[] = bucketKeys(dimension).map((key) => {
    const value = current.filter((ticket) => bucketKeyOf(ticket, dimension) === key).length

    return { key, value, share: current.length === 0 ? 0 : value / current.length }
  })

  return { range, dimension, total: current.length, buckets }
}

function emptyStatusCounts(): Record<TicketStatus, number> {
  return Object.fromEntries(TICKET_STATUSES.map((status) => [status, 0])) as Record<
    TicketStatus,
    number
  >
}

/**
 * One row per assignee who has a ticket in the range. Busiest first, then
 * alphabetically, so two loads of the same range order the table the same way.
 */
export function buildAssignees(
  tickets: readonly Ticket[],
  range: ReportRange,
): ReportAssigneesResponse {
  const current = cohort(tickets, range)
  const byAssignee = new Map<string, ReportAssigneeRow>()

  for (const ticket of current) {
    const row = byAssignee.get(ticket.assignee) ?? {
      assignee: ticket.assignee,
      total: 0,
      byStatus: emptyStatusCounts(),
    }

    row.total += 1
    row.byStatus[ticket.status] += 1
    byAssignee.set(ticket.assignee, row)
  }

  const rows = [...byAssignee.values()].sort(
    (a, b) => b.total - a.total || a.assignee.localeCompare(b.assignee),
  )

  return { range, total: current.length, rows }
}
