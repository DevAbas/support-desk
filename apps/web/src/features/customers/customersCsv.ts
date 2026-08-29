import { CUSTOMER_PLAN_LABELS, type CustomerSummary } from '@harness-sample/shared'
import { CSV_MIME_TYPE, toCsv, toFilenameDate } from '@/lib/csv'

/**
 * Serialises customers to CSV. The columns are what a row shows — the name it
 * leads with, the company and email under it, the plan on its badge, and the two
 * facts in its margin — with the plan brought up beside the identity rather than
 * left at the end, the same way the ticket export places the assignee where it
 * reads rather than where the table happens to stop.
 *
 * There is no id column. A customer id is never written on any of these screens,
 * and a file is not the place to introduce a field the product does not show.
 *
 * `signupDate` is written as the raw ISO date rather than through `formatDate`,
 * for the reason `ticketsCsv.ts` gives: a spreadsheet sorts and parses ISO, and
 * "5 Mar 2025" is a display format, not an interchange one.
 *
 * The quoting itself belongs to the format rather than to customers, and lives
 * in `lib/csv.ts` — the ticket and report exports write through the same writer.
 */

const HEADER = ['Name', 'Company', 'Email', 'Plan', 'Tickets', 'Signed up'] as const

export const CUSTOMERS_CSV_MIME_TYPE = CSV_MIME_TYPE

export function customersToCsv(customers: readonly CustomerSummary[]): string {
  const rows = customers.map((customer) => [
    customer.name,
    customer.company,
    customer.email,
    CUSTOMER_PLAN_LABELS[customer.plan],
    String(customer.ticketCount),
    customer.signupDate,
  ])

  return toCsv([HEADER, ...rows])
}

/** e.g. `customers-2026-08-29.csv`. */
export function customersCsvFilename(now: Date = new Date()): string {
  return `customers-${toFilenameDate(now)}.csv`
}
