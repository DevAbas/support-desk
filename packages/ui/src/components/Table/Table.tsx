import { cn } from '@harness-sample/shared'
import type {
  TableBodyProps,
  TableCellProps,
  TableHeadProps,
  TableHeaderCellProps,
  TableProps,
  TableRowProps,
} from './Table.types'

export function Table({ caption, className, children, ...props }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full border-collapse text-sm', className)} {...props}>
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  )
}

export function TableHead({ className, ...props }: TableHeadProps) {
  return (
    <thead
      className={cn('border-b border-border bg-surface-inset text-left', className)}
      {...props}
    />
  )
}

/**
 * Owns the loading and empty states so every caller renders them the same way.
 * When `isLoading` or `isEmpty` is set, `children` are replaced by a single
 * full-width message row.
 */
export function TableBody({
  columnCount,
  isLoading = false,
  isEmpty = false,
  loadingMessage = 'Loading…',
  emptyMessage = 'Nothing to show.',
  className,
  children,
  ...props
}: TableBodyProps) {
  const messageCellClasses = 'px-4 py-12 text-center text-sm text-fg-muted'

  if (isLoading) {
    return (
      <tbody className={className} {...props}>
        <tr>
          <td colSpan={columnCount} className={messageCellClasses}>
            <span role="status" aria-live="polite">
              {loadingMessage}
            </span>
          </td>
        </tr>
      </tbody>
    )
  }

  if (isEmpty) {
    return (
      <tbody className={className} {...props}>
        <tr>
          <td colSpan={columnCount} className={messageCellClasses}>
            {emptyMessage}
          </td>
        </tr>
      </tbody>
    )
  }

  return (
    <tbody className={className} {...props}>
      {children}
    </tbody>
  )
}

export function TableRow({ className, ...props }: TableRowProps) {
  return <tr className={cn('border-b border-border last:border-b-0', className)} {...props} />
}

export function TableHeaderCell({ scope = 'col', className, ...props }: TableHeaderCellProps) {
  return (
    <th
      scope={scope}
      className={cn('px-4 py-3 text-xs font-semibold tracking-wide text-fg-muted uppercase', className)}
      {...props}
    />
  )
}

export function TableCell({ className, ...props }: TableCellProps) {
  return <td className={cn('px-4 py-3 align-middle text-fg', className)} {...props} />
}
