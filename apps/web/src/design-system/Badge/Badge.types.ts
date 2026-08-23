import type { ComponentPropsWithRef } from 'react'

/**
 * The complete set of badge appearances. These are presentation states, not
 * domain values: mapping a ticket status onto one of these belongs in the
 * feature layer, not here.
 */
export type BadgeStatus = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

export interface BadgeProps extends ComponentPropsWithRef<'span'> {
  status?: BadgeStatus
}
