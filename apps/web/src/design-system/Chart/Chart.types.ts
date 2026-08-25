import type { ComponentPropsWithRef, ReactNode } from 'react'

/**
 * The complete set of chart mark appearances.
 *
 * Like `BadgeStatus`, these are presentation values. A chart does not know what
 * a ticket status is; the feature layer decides that "resolved" is drawn in the
 * success tone, the same way it decides which badge it gets.
 */
export type ChartTone = 'primary' | 'info' | 'success' | 'warning' | 'danger' | 'neutral'

export interface ChartDatum {
  /** Stable identity for the bar, so React keys survive a reordering. */
  id: string
  label: string
  value: number
  tone?: ChartTone
}

export interface BarChartProps extends Omit<ComponentPropsWithRef<'figure'>, 'children'> {
  /**
   * Describes the chart for anyone who cannot see it. Rendered as the caption of
   * the data table the chart is paired with, visually hidden — the same
   * arrangement `Table` uses.
   */
  caption: string
  data: readonly ChartDatum[]
  /** Heading for the value column, e.g. "Tickets". */
  valueLabel: string
  /** Heading for the category column. */
  categoryLabel?: string
  /** Applied to every drawn and read value, so the two never disagree. */
  formatValue?: (value: number) => string
  isLoading?: boolean
  loadingMessage?: ReactNode
  emptyMessage?: ReactNode
}
