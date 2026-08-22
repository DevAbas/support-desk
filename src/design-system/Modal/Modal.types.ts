import type { ReactNode } from 'react'

export interface ModalProps {
  open: boolean
  onClose: () => void
  /** Accessible name for the dialog, also rendered as its heading. */
  title: string
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  className?: string
}
