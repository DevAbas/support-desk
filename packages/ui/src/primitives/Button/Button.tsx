import { cn } from '@harness-sample/shared'
import type { ButtonProps, ButtonSize, ButtonVariant } from './Button.types'

const baseClasses =
  'inline-flex items-center justify-center gap-2 rounded-element border font-medium ' +
  'transition-colors focus-ring disabled:cursor-not-allowed disabled:opacity-50'

// Keyed by the union, so adding a variant without styling it is a type error.
const variantClasses: Record<ButtonVariant, string> = {
  primary: 'border-transparent bg-primary text-primary-fg hover:bg-primary-hover',
  secondary: 'border-border bg-surface text-fg hover:bg-muted',
  ghost: 'border-transparent bg-transparent text-fg-muted hover:bg-muted hover:text-fg',
  danger: 'border-transparent bg-danger text-danger-fg hover:bg-danger-hover',
  selected:
    'border-primary-border bg-primary-subtle text-primary-subtle-fg ' +
    'hover:bg-primary-subtle hover:text-primary-subtle-fg',
}

/**
 * The height comes from a token rather than from a fixed utility class, because
 * the two heights every control in the product lines up against are a decision
 * the design system makes and not one this file gets to keep to itself.
 *
 * The classes it replaced are not named here on purpose: Tailwind scans this
 * file as text, comments included, so a class written in prose is compiled as
 * though it were used — the same trap `Heading` and `apps/web/src/index.css`
 * both work around.
 */
const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-(--size-element-sm) px-3 text-body',
  md: 'h-(--size-element-md) px-4 text-body',
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
