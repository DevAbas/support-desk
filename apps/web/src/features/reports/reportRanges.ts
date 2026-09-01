import type { DateRangePreset } from '@support-desk/ui'
import type { ReportRange } from '@support-desk/shared'

/**
 * The ranges the reports screen offers.
 *
 * Every date here is read in UTC, because that is how the endpoints read the
 * range they are given. Doing it locally instead would make a report taken late
 * in the evening cover a different set of days from the one the server thought
 * it was asked for.
 *
 * `today` is a parameter rather than a call to `new Date()` inside these
 * functions, so a test can say when it is.
 */

const DAY_IN_MS = 24 * 60 * 60 * 1000

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * A span ending today, counted inclusively: "the last 7 days" is today and the
 * six before it, not today and the seven before it.
 */
function lastDays(count: number, today: Date): ReportRange {
  return {
    from: toIsoDate(new Date(today.getTime() - (count - 1) * DAY_IN_MS)),
    to: toIsoDate(today),
  }
}

/** The quarter so far: from the first of January, April, July or October. */
function quarterToDate(today: Date): ReportRange {
  const quarterStartMonth = Math.floor(today.getUTCMonth() / 3) * 3

  return {
    from: toIsoDate(new Date(Date.UTC(today.getUTCFullYear(), quarterStartMonth, 1))),
    to: toIsoDate(today),
  }
}

export function reportPresets(today: Date = new Date()): readonly DateRangePreset[] {
  return [
    { id: 'last-7-days', label: 'Last 7 days', range: lastDays(7, today) },
    { id: 'last-30-days', label: 'Last 30 days', range: lastDays(30, today) },
    { id: 'this-quarter', label: 'This quarter', range: quarterToDate(today) },
  ]
}

/**
 * The quarter, rather than the 30 days most reporting screens open on. The
 * seeded queue covers about two months and stops where the seed was generated,
 * so a narrower default would open this screen on an empty chart and leave
 * whoever is reading it to work out that the screen is fine and the data is
 * simply older than that.
 */
export function defaultReportRange(today: Date = new Date()): ReportRange {
  return quarterToDate(today)
}

/** How long a range is, in days, counting both ends. */
export function rangeLengthInDays(range: ReportRange): number {
  return (Date.parse(range.to) - Date.parse(range.from)) / DAY_IN_MS + 1
}
