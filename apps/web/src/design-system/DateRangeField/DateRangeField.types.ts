import type { ComponentPropsWithRef } from 'react'

/**
 * A closed range of calendar dates, both ends inclusive, as `YYYY-MM-DD`.
 *
 * Date-only strings are what `<input type="date">` reads and writes, they
 * compare chronologically as strings, and they survive a round trip through a
 * query string or a cache key unchanged — none of which is true of a `Date`.
 */
export interface DateRange {
  from: string
  to: string
}

export interface DateRangePreset {
  /** Stable identity for the preset. */
  id: string
  label: string
  /**
   * The range the preset stands for. Resolved by the caller, because what "the
   * last 7 days" means depends on when it is asked — and this component must
   * not be the thing that decides what "now" is.
   */
  range: DateRange
}

export interface DateRangeFieldProps
  extends Omit<ComponentPropsWithRef<'fieldset'>, 'onChange' | 'children'> {
  /** Names the whole control, rendered as the fieldset's legend. */
  legend: string
  value: DateRange
  presets: readonly DateRangePreset[]
  onChange: (range: DateRange) => void
  /** Bounds handed to both date inputs, as `YYYY-MM-DD`. */
  min?: string
  max?: string
  fromLabel?: string
  toLabel?: string
}
