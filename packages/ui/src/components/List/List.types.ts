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
 * A checkbox on a row, and the whole of what a caller passes to get one.
 *
 * One object rather than three loose props, because none of the three means
 * anything without the other two: a checkbox with no name cannot be used, and
 * one with no handler is a control that does not work. Grouped, the only two
 * things a caller can write are all of it and none of it.
 */
export interface ListRowSelection {
  /** Names the checkbox on its own: "Select Priya Raman", not "Select". */
  label: string
  isChecked: boolean
  onChange: (isChecked: boolean) => void
}

/**
 * `title` is omitted from the li props because here it is the row's heading, not
 * a tooltip — the same trade `CardHeader` makes. `onSelect` is omitted because
 * the DOM already has one, and it means text selection, not this.
 */
export interface ListRowProps extends Omit<ComponentPropsWithRef<'li'>, 'title' | 'onSelect'> {
  /**
   * Whatever the row leads with: an `Avatar`, an `Icon`, a `Badge`.
   *
   * Not a checkbox — this renders inside the row's own control, and `selection`
   * is where a box on a row goes.
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
  /**
   * Puts a checkbox beside the row, and not inside it.
   *
   * It cannot go in `leading`. An activatable row is one wide `Button`, and a
   * checkbox inside a button is not a checkbox: the click is swallowed by the
   * button, and the markup is invalid besides. So the checkbox is a sibling of
   * the row — its own control, its own tab stop — and the row stays one target.
   *
   * `isSelected` is a different question and the two are independent. This row
   * is ticked; that row is the one whose detail is open beside the list.
   */
  selection?: ListRowSelection
}
