import type { ComponentPropsWithRef } from 'react'

/**
 * `selected` is a variant rather than a `className` a caller assembles, because
 * "this is the one currently chosen" was written five different ways before it
 * was one of these. It says nothing on its own: what marks a selected control
 * for assistive technology is `aria-current`, `aria-pressed` or `aria-selected`,
 * whichever the surrounding pattern calls for, and that stays the caller's.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'selected'

export type ButtonSize = 'sm' | 'md'

export interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: ButtonVariant
  size?: ButtonSize
}
