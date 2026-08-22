import { cn } from '../../lib/cn'
import type { BadgeProps, BadgeStatus } from './Badge.types'

const baseClasses =
  'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium'

// Keyed by the union, so adding a status without styling it is a type error.
const statusClasses: Record<BadgeStatus, string> = {
  neutral: 'border-border bg-muted text-muted-fg',
  info: 'border-info-border bg-info-subtle text-info-subtle-fg',
  success: 'border-success-border bg-success-subtle text-success-subtle-fg',
  warning: 'border-warning-border bg-warning-subtle text-warning-subtle-fg',
  danger: 'border-danger-border bg-danger-subtle text-danger-subtle-fg',
}

export function Badge({ status = 'neutral', className, ...props }: BadgeProps) {
  return <span className={cn(baseClasses, statusClasses[status], className)} {...props} />
}
