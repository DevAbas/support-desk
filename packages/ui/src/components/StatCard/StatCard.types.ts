import type { ComponentPropsWithRef, ReactNode } from 'react'

/** Which way the figure moved. Rendered as an arrow and said in words. */
export type StatChangeDirection = 'up' | 'down' | 'flat'

/**
 * Whether the movement is good news.
 *
 * The design system cannot know: more tickets raised is bad, more tickets
 * resolved is good, and the same arrow serves both. The feature decides, the
 * same way it decides which `BadgeStatus` a ticket status maps to.
 */
export type StatChangeIntent = 'positive' | 'negative' | 'neutral'

export interface StatChange {
  /** The change itself, already formatted — e.g. `+12%`. */
  label: ReactNode
  direction: StatChangeDirection
  intent?: StatChangeIntent
  /** What it is a change against, e.g. "vs previous 30 days". */
  description?: ReactNode
}

/** `title` is omitted from the div props: the figure is labelled by `label`. */
export interface StatCardProps extends Omit<ComponentPropsWithRef<'div'>, 'title'> {
  /** What the figure counts, e.g. "Resolved". */
  label: ReactNode
  /** The figure itself, already formatted. */
  value: ReactNode
  change?: StatChange
  /** Owned here, so every stat card waits in the same way. */
  isLoading?: boolean
  loadingMessage?: string
}
