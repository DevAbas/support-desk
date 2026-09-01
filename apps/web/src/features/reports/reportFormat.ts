import type { StatChange, StatChangeDirection, StatChangeIntent } from '@support-desk/ui'
import type { ReportMetric } from '@support-desk/shared'

/**
 * Turning report figures into the strings the screen shows.
 *
 * The rounding rules live here rather than in the design system, which formats
 * nothing: `StatCard` takes a value that is already a string, so how a duration
 * or a percentage reads is a decision this screen owns.
 */

const MINUTE_IN_MS = 60 * 1000
const HOUR_IN_MS = 60 * MINUTE_IN_MS
const DAY_IN_MS = 24 * HOUR_IN_MS

/** What a figure reads as when the range holds nothing to measure. */
export const NO_VALUE = '—'

/**
 * A duration at the precision a person actually reads it at: days and hours, or
 * hours and minutes, never both ends of that at once. A ticket resolved in
 * "2d 4h" is a useful sentence; "2d 4h 17m 3s" is a timestamp.
 */
export function formatDuration(ms: number): string {
  if (ms <= 0) {
    return '0m'
  }

  const days = Math.floor(ms / DAY_IN_MS)
  const hours = Math.floor((ms % DAY_IN_MS) / HOUR_IN_MS)
  const minutes = Math.floor((ms % HOUR_IN_MS) / MINUTE_IN_MS)

  if (days > 0) {
    return hours > 0 ? `${String(days)}d ${String(hours)}h` : `${String(days)}d`
  }

  if (hours > 0) {
    return minutes > 0 ? `${String(hours)}h ${String(minutes)}m` : `${String(hours)}h`
  }

  return `${String(minutes)}m`
}

export function formatCount(value: number | null): string {
  return value === null ? NO_VALUE : value.toLocaleString('en-GB')
}

export function formatOptionalDuration(value: number | null): string {
  return value === null ? NO_VALUE : formatDuration(value)
}

function toDirection(changeRatio: number): StatChangeDirection {
  if (changeRatio > 0) {
    return 'up'
  }

  return changeRatio < 0 ? 'down' : 'flat'
}

const percentFormatter = new Intl.NumberFormat('en-GB', {
  style: 'percent',
  maximumFractionDigits: 0,
  signDisplay: 'exceptZero',
})

/**
 * Whether a movement is good news, which the figure itself cannot say. More
 * tickets raised is not an improvement; more resolved is. `neutral` is for the
 * figures where neither direction is a verdict.
 */
export type ChangePolarity = 'more-is-better' | 'less-is-better' | 'neutral'

function toIntent(direction: StatChangeDirection, polarity: ChangePolarity): StatChangeIntent {
  if (direction === 'flat' || polarity === 'neutral') {
    return 'neutral'
  }

  const isImprovement = polarity === 'more-is-better' ? direction === 'up' : direction === 'down'

  return isImprovement ? 'positive' : 'negative'
}

/**
 * The change a stat card shows, or nothing at all.
 *
 * A period that started from zero has no percentage growth however much it
 * gained, and the endpoint says so by sending a null ratio. Showing "+100%" or
 * "+∞" there would be inventing a number, so the card simply carries no change.
 */
export function toStatChange(
  metric: ReportMetric,
  polarity: ChangePolarity,
  description: string,
): StatChange | undefined {
  if (metric.changeRatio === null) {
    return undefined
  }

  const direction = toDirection(metric.changeRatio)

  return {
    label: percentFormatter.format(metric.changeRatio),
    direction,
    intent: toIntent(direction, polarity),
    description,
  }
}
