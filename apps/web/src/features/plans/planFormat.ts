/**
 * Turning plan terms into the strings the screen shows, and back.
 *
 * The contract keeps a price in whole pence, because money in a float is a
 * rounding error waiting for something to be totalled over it. Nobody types
 * pence, so this file owns both halves of that: what a stored price reads as,
 * and what a typed one parses to. They live together because they are one
 * decision — the format the field shows has to be a format the field accepts,
 * and the day those two disagreed the screen would refuse to save what it had
 * just drawn.
 *
 * The rounding rules are here rather than in the design system, which formats
 * nothing, for the same reason `reportFormat.ts` holds the reports'.
 */

/** What a plan with no seat limit reads as, wherever it is drawn or offered. */
export const UNLIMITED_SEATS_LABEL = 'Unlimited'

const PENCE_IN_A_POUND = 100

/**
 * Two formatters, because a price list should not draw whole pounds with a
 * decimal point on them. `£49` and `£49.99` are both prices; `£49.00` is a
 * spreadsheet.
 */
const wholePounds = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
})

const poundsAndPence = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
})

export function formatMonthlyPrice(pence: number): string {
  const pounds = pence / PENCE_IN_A_POUND

  return pence % PENCE_IN_A_POUND === 0 ? wholePounds.format(pounds) : poundsAndPence.format(pounds)
}

export function formatSeatLimit(seatLimit: number | null): string {
  return seatLimit === null ? UNLIMITED_SEATS_LABEL : seatLimit.toLocaleString('en-GB')
}

/**
 * A stored price as the text the field starts with: `19`, or `19.99`.
 *
 * Without the currency symbol and without a thousands separator, because this is
 * a value to be edited rather than a figure to be read, and everything drawn
 * around a number is something the parser below would have to strip back off.
 */
export function toPriceField(pence: number): string {
  return pence % PENCE_IN_A_POUND === 0
    ? String(pence / PENCE_IN_A_POUND)
    : (pence / PENCE_IN_A_POUND).toFixed(2)
}

/** Pounds, optionally a point, and at most two figures after it. */
const PRICE_PATTERN = /^(\d{1,7})(?:\.(\d{1,2}))?$/

/**
 * A typed price as whole pence, or null where it is not a price.
 *
 * Parsed out of the digits rather than multiplied through a float: `19.99` as a
 * number times a hundred is 1998.9999999999998, and a price list that rounds is
 * a price list that can be a penny out. The two capture groups are the two sides
 * of the point, and each is already an integer.
 *
 * Null rather than a thrown error or a NaN, because "that is not a price" is an
 * answer the field has to render as a sentence either way.
 */
export function parsePriceField(value: string): number | null {
  const match = PRICE_PATTERN.exec(value.trim())

  if (!match) {
    return null
  }

  const [, pounds = '0', pence = ''] = match

  return Number(pounds) * PENCE_IN_A_POUND + Number(pence.padEnd(2, '0'))
}

/** Whole seats, and no exponent: `1e3` is a number and is not a seat count. */
const SEATS_PATTERN = /^\d{1,7}$/

/**
 * A typed seat count as a whole number, or null where it is not one.
 *
 * Null here means "that is not a seat count", not "unlimited" — the two are
 * different answers and the second one is a checkbox, not a value this field can
 * take. Whichever control asks holds that distinction; this one only parses.
 */
export function parseSeatsField(value: string): number | null {
  const match = SEATS_PATTERN.exec(value.trim())

  return match ? Number(match[0]) : null
}
