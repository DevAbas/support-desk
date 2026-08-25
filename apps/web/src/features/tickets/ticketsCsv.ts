import { taxonomyLabel, type TaxonomyEntry, type Ticket } from '@harness-sample/shared'

/**
 * Serialises tickets to RFC 4180 CSV. The columns mirror the ticket table, plus
 * the assignee, which the table has no room for.
 *
 * `createdAt` is written as its raw ISO timestamp rather than through
 * `formatDate`: a spreadsheet sorts and parses ISO correctly, and "5 Mar 2025"
 * is a display format, not an interchange one.
 */

const HEADER = ['Ticket', 'Title', 'Status', 'Priority', 'Assignee', 'Created'] as const

export const TICKETS_CSV_MIME_TYPE = 'text/csv;charset=utf-8'

/** Leading characters a spreadsheet would read as the start of a formula. */
const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r']

/**
 * Every field is quoted, which is always valid and saves deciding per value
 * whether a comma, quote or newline made quoting necessary. A ticket title is
 * user-supplied, so a leading formula character is neutralised with an
 * apostrophe before quoting.
 */
function escapeField(value: string): string {
  const guarded = FORMULA_PREFIXES.some((prefix) => value.startsWith(prefix)) ? `'${value}` : value

  return `"${guarded.replaceAll('"', '""')}"`
}

/**
 * The taxonomy is passed in rather than read here, because this file is not a
 * component and the labels are server state. A value with no entry is written
 * out raw, which is the same fallback the badges use.
 */
export interface TicketsCsvLabels {
  statuses: readonly TaxonomyEntry[]
  priorities: readonly TaxonomyEntry[]
}

export function ticketsToCsv(
  tickets: readonly Ticket[],
  { statuses, priorities }: TicketsCsvLabels,
): string {
  const rows = tickets.map((ticket) => [
    ticket.id,
    ticket.title,
    taxonomyLabel(statuses, ticket.status),
    taxonomyLabel(priorities, ticket.priority),
    ticket.assignee,
    ticket.createdAt,
  ])

  return [HEADER, ...rows].map((row) => row.map(escapeField).join(',')).join('\r\n')
}

/** e.g. `tickets-2026-08-22.csv`. */
export function ticketsCsvFilename(now: Date = new Date()): string {
  return `tickets-${now.toISOString().slice(0, 10)}.csv`
}
