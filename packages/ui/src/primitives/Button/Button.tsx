import { cn } from '@support-desk/shared'
import type { ButtonProps, ButtonSize, ButtonVariant } from './Button.types'

const baseClasses =
  'inline-flex items-center justify-center gap-2 rounded-element border font-medium ' +
  'interactive focus-ring disabled:cursor-not-allowed disabled:opacity-50'

/**
 * Keyed by the union, so adding a variant without styling it is a type error.
 *
 * A variant declares a background and no states. Hover and pressed are a tint
 * laid over whatever that background is, and they arrive with `interactive` on
 * the base — which is why every line here is shorter than it was and why the
 * sixth variant will not need a colour of its own to be hoverable.
 *
 * `ghost` keeps one hover of its own, and it is a foreground rather than a
 * background: the tint answers "is this responding to me", the text coming up
 * to full strength answers "this is the one you are pointing at", and a muted
 * control is the only place the second question needs asking.
 *
 * `selected` used to restate its own two colours on hover, which was a way of
 * saying "do not change" — so the one control on screen that was already
 * chosen was also the only one that ignored the pointer. It now tints like
 * everything else.
 */
const variantClasses: Record<ButtonVariant, string> = {
  primary: 'border-transparent bg-primary text-primary-fg',
  secondary: 'border-border bg-surface text-fg',
  ghost: 'border-transparent bg-transparent text-fg-muted hover:text-fg',
  danger: 'border-transparent bg-danger text-danger-fg',
  selected: 'border-primary-border bg-primary-subtle text-primary-subtle-fg',
}

/**
 * The height comes from a token rather than from a fixed utility class, because
 * the two heights every control in the product lines up against are a decision
 * the design system makes and not one this file gets to keep to itself.
 *
 * The horizontal padding is not a token, and it is the half of a control's size
 * a theme still cannot reach. A density change moves both heights in
 * `tokens.css` and then has to come here to move the padding beside them, even
 * though the two numbers describe one decision. Naming them is the fix; it is
 * the same fix the heights already got.
 *
 * The classes involved are not named in this comment on purpose: Tailwind scans
 * this file as text, comments included, so a class written in prose is compiled
 * as though it were used — the same trap `Heading` and `apps/web/src/index.css`
 * both work around.
 */
const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-(--size-element-sm) px-2.5 text-body',
  md: 'h-(--size-element-md) px-3.5 text-body',
}

export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      {...props}
    />
  )
}
