import { cn } from '@harness-sample/shared'
import { EMPTY_MESSAGE, LOADING_MESSAGE, StateMessage } from '../../primitives/StateMessage'
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
 * full-width message row, drawn by the same `StateMessage` a list and a chart
 * use — loading wins over empty, because nothing having arrived yet is not the
 * same as there being nothing.
 */
export function TableBody({
  columnCount,
  isLoading = false,
  isEmpty = false,
  loadingMessage = LOADING_MESSAGE,
  emptyMessage = EMPTY_MESSAGE,
  className,
  children,
  ...props
}: TableBodyProps) {
  if (isLoading || isEmpty) {
    return (
      <tbody className={className} {...props}>
        <tr>
          <td colSpan={columnCount}>
            <StateMessage isLoading={isLoading}>
              {isLoading ? loadingMessage : emptyMessage}
            </StateMessage>
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
