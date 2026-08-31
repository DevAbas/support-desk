import type { ReactNode } from 'react'

export interface DialogProps {
  open: boolean
  onClose: () => void
  /** Accessible name for the dialog, also rendered as its heading. */
  title: ReactNode
  description?: ReactNode
  /** Accessible name for the close button — "Close dialog", "Close drawer". */
  closeLabel: string
  /** Where the panel sits over the page, and how it arrives. */
  overlayClassName?: string
  /** The panel's own size, edge, radius and animation. */
  panelClassName?: string
  /** Ellipsis rather than wrap, for a panel that cannot grow to fit its title. */
  truncateTitle?: boolean
  /**
   * What sits at the top of the panel, in place of the heading and the close
   * button.
   *
   * The fourth seam, and the same kind as the other three: a modal and a drawer
   * differ in where the panel sits, how it arrives and what scrolls, and a
   * palette differs in one more thing — its top is a control rather than a
   * heading. Dressing that as a `CardHeader` would mean a title nobody reads
   * above a field that is the whole point of the panel.
   *
   * `title` still names the dialog when this is given. It is rendered visually
   * hidden and pointed at by `aria-labelledby`, exactly as it is otherwise, so
   * there is one mechanism naming a dialog rather than one per shape and no
   * shape that can be drawn without a name.
   */
  header?: ReactNode
  /**
   * The body, wrapped by the caller.
   *
   * Deliberately not wrapped here: whether the contents scroll, and whether
   * there is a body at all when there is nothing in it, is one of the few real
   * differences between a modal and a drawer.
   */
  children?: ReactNode
  footer?: ReactNode
}
