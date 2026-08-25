import type { BadgeStatus, SelectOption } from '@/design-system'
import { TICKET_APPEARANCES, type TicketAppearance } from '@harness-sample/shared'

/**
 * The domain-to-presentation mapping, written out rather than assumed.
 *
 * A `TicketAppearance` is what an admin picked for a status; a `BadgeStatus` is
 * what the design system knows how to paint. The two use the same five words
 * today, and this table is what keeps that a coincidence the design system does
 * not have to depend on — it is keyed by the domain union, so a new appearance
 * without a badge to render it is a compile error.
 */
export const badgeStatusByAppearance: Record<TicketAppearance, BadgeStatus> = {
  neutral: 'neutral',
  info: 'info',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
}

const APPEARANCE_LABELS: Record<TicketAppearance, string> = {
  neutral: 'Neutral',
  info: 'Info',
  success: 'Success',
  warning: 'Warning',
  danger: 'Danger',
}

/** What the appearance dropdown in the Settings editor offers. */
export const appearanceOptions: readonly SelectOption<TicketAppearance>[] =
  TICKET_APPEARANCES.map((appearance) => ({
    value: appearance,
    label: APPEARANCE_LABELS[appearance],
  }))
