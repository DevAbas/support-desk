/**
 * Serialises rows to RFC 4180 CSV.
 *
 * This was lifted out of `features/tickets/ticketsCsv.ts` when the reports
 * screen needed to export as well: quoting and formula-guarding are properties
 * of the format, not of what is being exported, and two copies of the escaping
 * would be two places for a spreadsheet-injection guard to be missed.
 *
 * What each export means — which columns, in which order, under which filename —
 * stays with the feature that knows.
 */

export const CSV_MIME_TYPE = 'text/csv;charset=utf-8'

/** Leading characters a spreadsheet would read as the start of a formula. */
const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r']

/**
 * Every field is quoted, which is always valid and saves deciding per value
 * whether a comma, quote or newline made quoting necessary. Values can be
 * user-supplied, so a leading formula character is neutralised with an
 * apostrophe before quoting.
 */
function escapeField(value: string): string {
  const guarded = FORMULA_PREFIXES.some((prefix) => value.startsWith(prefix)) ? `'${value}` : value

  return `"${guarded.replaceAll('"', '""')}"`
}

export function toCsv(rows: readonly (readonly string[])[]): string {
  return rows.map((row) => row.map(escapeField).join(',')).join('\r\n')
}

/** `2026-08-22`, for stamping a filename with the day it was taken. */
export function toFilenameDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}
