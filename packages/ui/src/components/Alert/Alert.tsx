import { cn } from '@harness-sample/shared'
import type { AlertProps, AlertTone } from './Alert.types'

const baseClasses = 'flex items-start justify-between gap-4 rounded-md border px-4 py-3 text-sm'

// Keyed by the union, so adding a tone without styling it is a type error.
const toneClasses: Record<AlertTone, string> = {
  info: 'border-info-border bg-info-subtle text-info-subtle-fg',
  success: 'border-success-border bg-success-subtle text-success-subtle-fg',
  warning: 'border-warning-border bg-warning-subtle text-warning-subtle-fg',
  danger: 'border-danger-border bg-danger-subtle text-danger-subtle-fg',
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

export function Alert({ tone = 'info', title, action, className, children, ...props }: AlertProps) {
  return (
    <div
      role={roleByTone[tone]}
      className={cn(baseClasses, toneClasses[tone], className)}
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
