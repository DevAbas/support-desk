import { cn } from '@harness-sample/shared'
import type { AlertProps, AlertTone, AlertVariant } from './Alert.types'

const baseClasses = 'flex justify-between gap-4 text-body'

// Keyed by the union, so adding a tone without styling it is a type error.
const toneClasses: Record<AlertTone, string> = {
  info: 'border-info-border bg-info-subtle text-info-subtle-fg',
  success: 'border-success-border bg-success-subtle text-success-subtle-fg',
  warning: 'border-warning-border bg-warning-subtle text-warning-subtle-fg',
  danger: 'border-danger-border bg-danger-subtle text-danger-subtle-fg',
}

/**
 * Keyed by the union in the same way, and merged after the tone so that a
 * variant which wants no fill can say so: `bg-transparent` has to come after
 * `bg-danger-subtle` for tailwind-merge to drop the one it replaces.
 *
 * Each variant sets its own border width. The base sets none, so a variant that
 * names no border draws none — a tone contributes a border *colour* and nothing
 * that would show it.
 */
const variantClasses: Record<AlertVariant, string> = {
  callout: 'items-start rounded-element border px-4 py-3',
  inline: 'items-start bg-transparent p-0',
  band: 'items-center border-b px-4 py-3',
}

/**
 * How urgently a message interrupts follows from its tone rather than from the
 * caller remembering: a failure is announced assertively, everything else
 * politely. That is why `role` is not a prop.
 */
const roleByTone: Record<AlertTone, 'alert' | 'status'> = {
  info: 'status',
  success: 'status',
  warning: 'status',
  danger: 'alert',
}

export function Alert({
  tone = 'info',
  variant = 'callout',
  title,
  action,
  className,
  children,
  ...props
}: AlertProps) {
  return (
    <div
      role={roleByTone[tone]}
      className={cn(baseClasses, toneClasses[tone], variantClasses[variant], className)}
      {...props}
    >
      <div className="flex min-w-0 flex-col gap-1">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className="min-w-0">{children}</div> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  )
}
