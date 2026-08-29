import { Button } from '../../primitives/Button'
import { cn } from '@harness-sample/shared'
import { EMPTY_MESSAGE, LOADING_MESSAGE, StateMessage } from '../../primitives/StateMessage'
import type { ListProps, ListRowProps } from './List.types'

/**
 * A dense list, for a lot of rows that are each read at a glance.
 *
 * Not a `Table` with the borders taken off. A table is a grid: it has columns,
 * every row answers the same questions in the same order, and a header says what
 * those questions are. A list has a shape instead — something to lead with, a
 * line, a quieter line under it — and rows that are scanned down rather than
 * read across. Both exist here because both are true of some screens.
 *
 * Loading and empty states belong to `List` for the same reason they belong to
 * `TableBody`: so that every list announces them the same way rather than only
 * the ones that remembered to.
 */
export function List({
  label,
  isLoading = false,
  isEmpty = false,
  loadingMessage = LOADING_MESSAGE,
  emptyMessage = EMPTY_MESSAGE,
  className,
  children,
  ...props
}: ListProps) {
  // `role="list"` is explicit because removing the bullets also removes the
  // list semantics in some browsers, and a list of rows that is not a list is
  // the whole structure gone.
  const listClasses = cn('flex flex-col divide-y divide-border', className)

  if (isLoading || isEmpty) {
    return (
      <ul role="list" aria-label={label} className={listClasses} {...props}>
        <li>
          <StateMessage isLoading={isLoading}>
            {isLoading ? loadingMessage : emptyMessage}
          </StateMessage>
        </li>
      </ul>
    )
  }

  return (
    <ul role="list" aria-label={label} className={listClasses} {...props}>
      {children}
    </ul>
  )
}

/**
 * One row.
 *
 * When `onSelect` is given the whole row becomes the control, rather than a link
 * somewhere inside it: a dense row is a small target, and the useful target is
 * all of it. It is built on `Button` rather than beside it, so the focus ring,
 * the disabled treatment and the `type="button"` default are the ones every
 * other control in the app uses.
 *
 * A selected row carries `aria-current`, not `aria-selected`. Nothing here is a
 * listbox — the row is not being chosen, it is the one whose detail is open
 * beside it, and `aria-current` is what says that.
 */
export function ListRow({
  leading,
  title,
  subtitle,
  meta,
  trailing,
  onSelect,
  isSelected = false,
  className,
  ...props
}: ListRowProps) {
  const content = (
    <>
      {leading ? <span className="flex shrink-0 items-center">{leading}</span> : null}

      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body font-medium text-fg">{title}</span>
        {subtitle ? <span className="truncate text-caption text-fg-muted">{subtitle}</span> : null}
      </span>

      {meta ? <span className="shrink-0 text-caption text-fg-muted">{meta}</span> : null}
      {trailing ? <span className="flex shrink-0 items-center">{trailing}</span> : null}
    </>
  )

  const rowClasses = 'flex w-full items-center gap-3 px-4 py-2 text-left'

  return (
    <li className={cn('bg-surface', className)} {...props}>
      {onSelect ? (
        <Button
          variant={isSelected ? 'selected' : 'ghost'}
          aria-current={isSelected ? true : undefined}
          onClick={onSelect}
          className={cn(
            rowClasses,
            // A row is as tall as what is in it, and square with its neighbours.
            'h-auto rounded-none border-0 font-normal',
            !isSelected && 'hover:bg-surface-muted',
          )}
        >
          {content}
        </Button>
      ) : (
        <div className={rowClasses}>{content}</div>
      )}
    </li>
  )
}
