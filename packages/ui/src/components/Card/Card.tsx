import { cn } from '@harness-sample/shared'
import { Heading } from '../../primitives/Heading'
import { Text } from '../../primitives/Text'
import type { CardBodyProps, CardFooterProps, CardHeaderProps, CardProps } from './Card.types'

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-lg border border-border bg-surface shadow-card', className)}
      {...props}
    />
  )
}

export function CardHeader({
  title,
  description,
  actions,
  level = 'section',
  as,
  titleId,
  descriptionId,
  truncateTitle = false,
  className,
  ...props
}: CardHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 border-b border-border px-5 py-4',
        className,
      )}
      {...props}
    >
      {/* `min-w-0` rides with the clipping rather than being its own prop:
          `truncate` does nothing without it in a flex row, and on its own it
          would make a long card title overflow instead of widening the header. */}
      <div className={cn('flex flex-col gap-1', truncateTitle && 'min-w-0')}>
        <Heading level={level} as={as} id={titleId} className={cn(truncateTitle && 'truncate')}>
          {title}
        </Heading>
        {description ? (
          <Text tone="muted" id={descriptionId}>
            {description}
          </Text>
        ) : null}
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
