import type { ComponentPropsWithRef, ReactNode } from 'react'

/**
 * The complete set of alert appearances. Like `BadgeStatus`, these are
 * presentation states rather than domain values: what makes a message urgent is
 * the feature's judgement, not this component's.
 */
export type AlertTone = 'info' | 'success' | 'warning' | 'danger'

/** `title` is omitted from the div props: here it is a heading, not a tooltip. */
export interface AlertProps extends Omit<ComponentPropsWithRef<'div'>, 'title'> {
  tone?: AlertTone
  title?: ReactNode
  /** A single affordance the message offers, such as "Try again". */
  action?: ReactNode
}
