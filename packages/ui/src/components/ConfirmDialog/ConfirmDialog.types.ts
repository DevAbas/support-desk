import type { ReactNode } from 'react'

export interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  /** Accessible name for the dialog, also rendered as its heading. */
  title: string
  /** What confirming will do, and whether it can be undone. */
  description?: ReactNode
  onConfirm: () => void
  /** Says what will happen — "Delete tickets", not "OK". */
  confirmLabel: string
  cancelLabel?: string
  /**
   * Draws the confirming button as destructive.
   *
   * Not derived from the label: whether an action is destructive is the
   * feature's judgement, the same way a `BadgeStatus` is.
   */
  isDanger?: boolean
  /** Disables both buttons while the action is in flight. */
  isBusy?: boolean
  /** What the confirming button says while busy. Defaults to `confirmLabel`. */
  busyLabel?: string
  /** Anything the question needs beyond its description. */
  children?: ReactNode
}
