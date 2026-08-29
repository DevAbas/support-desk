import type { ReactNode } from 'react'

/** Which edge the panel is attached to, and so which way it slides in. */
export type DrawerSide = 'right' | 'left'

export interface DrawerProps {
  open: boolean
  onClose: () => void
  /** Accessible name for the drawer, also rendered as its heading. */
  title: ReactNode
  description?: ReactNode
  side?: DrawerSide
  children?: ReactNode
  footer?: ReactNode
  className?: string
}
