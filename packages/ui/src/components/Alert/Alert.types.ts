import type { ComponentPropsWithRef, ReactNode } from 'react'

/**
 * The complete set of alert appearances. Like `BadgeStatus`, these are
 * presentation states rather than domain values: what makes a message urgent is
 * the feature's judgement, not this component's.
 */
export type AlertTone = 'info' | 'success' | 'warning' | 'danger'

/**
 * The shape a message takes, which is a separate question from its tone.
 *
 * Tone is what the message means; variant is where it sits. Three screens had
 * been answering the second question in `className` — a toolbar switching off
 * the border, the fill and the padding, and two cards squaring a callout into a
 * band by dropping the rounding and the side and top borders. That is `Alert`
 * imported for its tone and the role that follows from it, and then taken apart
 * to fit where it landed.
 *
 * Named for the shape being asked for rather than for the classes each one
 * drops: a list of switched-off classes says what a caller took away, and a
 * variant name says what they wanted.
 *
 * - `callout` stands on its own: a tinted, bordered, rounded box.
 * - `inline` sits in a row of controls and carries no chrome, because the row
 *   around it already has the padding and the border.
 * - `band` spans a card from edge to edge, square with its sides, separated from
 *   what follows by its bottom edge alone.
 */
export type AlertVariant = 'callout' | 'inline' | 'band'

/** `title` is omitted from the div props: here it is a heading, not a tooltip. */
export interface AlertProps extends Omit<ComponentPropsWithRef<'div'>, 'title'> {
  tone?: AlertTone
  variant?: AlertVariant
  title?: ReactNode
  /** A single affordance the message offers, such as "Try again". */
  action?: ReactNode
}
