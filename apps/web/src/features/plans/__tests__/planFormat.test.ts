import { describe, expect, it } from 'vitest'
import {
  formatMonthlyPrice,
  formatSeatLimit,
  parsePriceField,
  parseSeatsField,
  toPriceField,
  UNLIMITED_SEATS_LABEL,
} from '@/features/plans/planFormat'

/**
 * The two halves of a price field, tested against each other.
 *
 * What matters here is not that either function produces a particular string —
 * the screen test asserts that — but that the pair agree: the format the field
 * shows has to be a format the field accepts, and the day those two disagreed
 * the dialog would refuse to save what it had just drawn.
 */
describe('a price, drawn and read back', () => {
  const prices = [0, 1, 50, 1_900, 4_999, 19_900, 999_999]

  it('parses back to the pence it was drawn from', () => {
    for (const pence of prices) {
      expect(parsePriceField(toPriceField(pence))).toBe(pence)
    }
  })

  it('draws whole pounds without a decimal point and pence with one', () => {
    expect(formatMonthlyPrice(0)).toBe('£0')
    expect(formatMonthlyPrice(1_900)).toBe('£19')
    expect(formatMonthlyPrice(1_999)).toBe('£19.99')
    // A price list should not draw £49.00. That is a spreadsheet.
    expect(formatMonthlyPrice(4_900)).toBe('£49')
  })

  it('draws the value to edit without the chrome the parser would have to strip', () => {
    expect(toPriceField(19_900)).toBe('199')
    expect(toPriceField(1_999)).toBe('19.99')
    // No thousands separator, which `Intl` would add at four figures and the
    // parser below would then reject.
    expect(toPriceField(999_999)).toBe('9999.99')
  })
})

describe('reading a typed price', () => {
  it('reads whole pounds, and pounds with pence', () => {
    expect(parsePriceField('19')).toBe(1_900)
    expect(parsePriceField('19.99')).toBe(1_999)
    expect(parsePriceField('0')).toBe(0)
  })

  it('reads a single figure after the point as tens of pence', () => {
    // "19.9" is nineteen pounds ninety, not nineteen pounds and nine pence.
    expect(parsePriceField('19.9')).toBe(1_990)
  })

  it('does not lose a penny to a float', () => {
    // `parseFloat('19.99') * 100` is 1998.9999999999998, and a price list that
    // rounds is a price list that can be a penny out. Each side of the point is
    // already an integer, so neither is multiplied through a float.
    for (let pence = 0; pence < 100; pence += 1) {
      expect(parsePriceField(`19.${String(pence).padStart(2, '0')}`)).toBe(1_900 + pence)
    }
  })

  it('ignores the spacing somebody typed around it', () => {
    expect(parsePriceField('  49  ')).toBe(4_900)
  })

  it('refuses anything that is not a price', () => {
    // Each of these arrives as an empty string from a `type="number"` field,
    // which is why both figures on this form are text fields.
    for (const value of ['', '   ', 'forty nine', '£49', '49p', '-1', '1e3', '19.999', '.5']) {
      expect(parsePriceField(value)).toBeNull()
    }
  })
})

describe('a seat limit', () => {
  it('says a plan has no limit rather than drawing a number for it', () => {
    expect(formatSeatLimit(null)).toBe(UNLIMITED_SEATS_LABEL)
    expect(formatSeatLimit(50)).toBe('50')
    expect(formatSeatLimit(10_000)).toBe('10,000')
  })

  it('reads a whole number of seats', () => {
    expect(parseSeatsField('50')).toBe(50)
    expect(parseSeatsField(' 10 ')).toBe(10)
  })

  it('refuses anything that is not a whole number of seats', () => {
    // Null means "that is not a seat count" and never "unlimited": the second is
    // a checkbox, not a value this field can take.
    for (const value of ['', 'lots', '12.5', '-1', '1e3', '10,000']) {
      expect(parseSeatsField(value)).toBeNull()
    }
  })
})
