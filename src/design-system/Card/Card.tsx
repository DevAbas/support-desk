import { cn } from '../../lib/cn'
import type { CardBodyProps, CardFooterProps, CardHeaderProps, CardProps } from './Card.types'

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-lg border border-border bg-surface shadow-card', className)}
      {...props}
    />
  )
}

export function CardHeader({ title, description, actions, className, ...props }: CardHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 border-b border-border px-5 py-4',
        className,
      )}
      {...props}
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-fg">{title}</h2>
        {description ? <p className="text-sm text-fg-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function CardBody({ className, ...props }: CardBodyProps) {
  return <div className={cn('px-5 py-4', className)} {...props} />
}

export function CardFooter({ className, ...props }: CardFooterProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-2 border-t border-border bg-surface-muted px-5 py-3',
        className,
      )}
      {...props}
    />
  )
}
