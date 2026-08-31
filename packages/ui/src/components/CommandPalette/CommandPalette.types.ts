import type { ReactNode } from 'react'

/**
 * One thing that can be picked.
 *
 * The shape is `ListRow`'s on purpose — something to lead with, a line, a
 * quieter line under it, something at the end — because a row of results is
 * scanned down exactly the way a list is. It is not a `ListRow`: that renders an
 * `li` and, when it is activatable, a `Button`, and neither is allowed inside a
 * listbox. What is shared is the shape a reader sees, not the markup.
 *
 * `id` is what `onSelect` hands back, so the caller never has to reconcile an
 * index against an array it has since replaced.
 */
export interface CommandPaletteOption {
  id: string
  /** Whatever the row leads with: an `Avatar`, an `Icon`. */
  leading?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  /** A badge, after the text. */
  trailing?: ReactNode
}

export interface CommandPaletteGroup {
  id: string
  /** The heading above the group — "Tickets", "Go to". */
  label: string
  /**
   * A note beside the heading: "5 of 40", a count, a hint.
   *
   * The palette draws it and does not compose it. How many of something matched
   * and how that reads as a sentence is the caller's, in the same way a
   * `BadgeStatus` is.
   */
  meta?: ReactNode
  options: readonly CommandPaletteOption[]
}

export interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  /**
   * Names the palette: the dialog, the field inside it, and the list of results
   * under it. One word — "Search" — because they are one thing to the person
   * using it, and three prop names for it would be three chances to disagree.
   */
  label: string
  /** What the empty field says. Not a name: `label` is the name. */
  placeholder?: string
  value: string
  onValueChange: (value: string) => void
  /**
   * What is on offer, grouped and in the order they should be read.
   *
   * Data rather than composition, and that is the load-bearing decision here. The
   * arrow keys walk one flat sequence of options and `aria-activedescendant`
   * names a position in it; built out of children, that sequence would be a
   * second thing derived from the markup, and the day a caller nested an option
   * one level deeper the keyboard would walk an order the screen does not show.
   * One array is walked twice — once to draw and once to move — so the two cannot
   * disagree.
   */
  groups: readonly CommandPaletteGroup[]
  /** The `id` of the option that was picked, by Enter or by pointer. */
  onSelect: (optionId: string) => void
  isLoading?: boolean
  loadingMessage?: ReactNode
  emptyMessage?: ReactNode
  /**
   * Why the last search did not answer.
   *
   * A band inside the panel rather than something the caller renders into it: a
   * palette is `aria-modal`, so a message on the page behind it is a message
   * nobody is told about — the same reason `ConfirmDialog` takes one.
   */
  error?: ReactNode
}
