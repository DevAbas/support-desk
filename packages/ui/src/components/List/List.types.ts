import type { ComponentPropsWithRef, ReactNode } from 'react'

export interface ListProps extends ComponentPropsWithRef<'ul'> {
  /**
   * Describes the list for screen readers, the way `Table` takes a caption. A
   * list of sixty rows that is announced only as "list" is sixty rows of
   * unattributed text.
   */
  label: string
  isLoading?: boolean
  isEmpty?: boolean
  loadingMessage?: ReactNode
  emptyMessage?: ReactNode
}

/**
 * `title` is omitted from the li props because here it is the row's heading, not
 * a tooltip — the same trade `CardHeader` makes. `onSelect` is omitted because
 * the DOM already has one, and it means text selection, not this.
 */
export interface ListRowProps extends Omit<ComponentPropsWithRef<'li'>, 'title' | 'onSelect'> {
  /**
   * Whatever the row leads with: an `Avatar`, an `Icon`, a `Checkbox`. All
   * three are primitives now, so a row that leads with a selection box takes
   * the one every other checkbox in the app is, rather than a raw input
   * dressed to match.
   */
  leading?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  /** Secondary detail, aligned to the end: a date, a count. */
  meta?: ReactNode
  /** A badge or an action, after the meta. */
  trailing?: ReactNode
  /** Makes the whole row activatable. Without it, the row is not interactive. */
  onSelect?: () => void
  /** Marks this as the row currently being shown elsewhere on the screen. */
  isSelected?: boolean
}
