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
   * The body, wrapped by the caller.
   *
   * Deliberately not wrapped here: whether the contents scroll, and whether
   * there is a body at all when there is nothing in it, is one of the few real
   * differences between a modal and a drawer.
   */
  children?: ReactNode
  footer?: ReactNode
}
