import { TICKET_PRIORITY_LABELS, TICKET_STATUS_LABELS, type Ticket } from '@support-desk/shared'
import { CSV_MIME_TYPE, toCsv, toFilenameDate } from '@/lib/csv'

/**
 * Serialises tickets to CSV. The columns mirror the ticket table, plus the
 * assignee, which the table has no room for.
 *
 * `createdAt` is written as its raw ISO timestamp rather than through
 * `formatDate`: a spreadsheet sorts and parses ISO correctly, and "5 Mar 2025"
 * is a display format, not an interchange one.
 *
 * The quoting itself belongs to the format rather than to tickets, and lives in
 * `lib/csv.ts` — the reports screen exports through the same writer.
 */

const HEADER = ['Ticket', 'Title', 'Status', 'Priority', 'Assignee', 'Created'] as const

export const TICKETS_CSV_MIME_TYPE = CSV_MIME_TYPE

export function ticketsToCsv(tickets: readonly Ticket[]): string {
  const rows = tickets.map((ticket) => [
    ticket.id,
    ticket.title,
    TICKET_STATUS_LABELS[ticket.status],
    TICKET_PRIORITY_LABELS[ticket.priority],
    ticket.assignee,
    ticket.createdAt,
  ])

  return toCsv([HEADER, ...rows])
}

/** e.g. `tickets-2026-08-22.csv`. */
export function ticketsCsvFilename(now: Date = new Date()): string {
  return `tickets-${toFilenameDate(now)}.csv`
}
