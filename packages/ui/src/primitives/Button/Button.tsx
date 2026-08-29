import { cn } from '@harness-sample/shared'
import type { ButtonProps, ButtonSize, ButtonVariant } from './Button.types'

const baseClasses =
  'inline-flex items-center justify-center gap-2 rounded-md border font-medium ' +
  'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ' +
  'focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50'

// Keyed by the union, so adding a variant without styling it is a type error.
const variantClasses: Record<ButtonVariant, string> = {
  primary: 'border-transparent bg-primary text-primary-fg hover:bg-primary-hover',
  secondary: 'border-border bg-surface text-fg hover:bg-muted',
  ghost: 'border-transparent bg-transparent text-fg-muted hover:bg-muted hover:text-fg',
  danger: 'border-transparent bg-danger text-danger-fg hover:bg-danger-hover',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
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
