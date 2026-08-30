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
  /**
   * Why the last attempt did not work, rendered inside the dialog.
   *
   * A confirmation is `aria-modal`, which says the rest of the page is not
   * there — so an error band on the screen behind it is a message nobody is
   * told about and a sighted reader has to dismiss the dialog to read. The
   * answer to a question asked here is reported here, beside the button that
   * will be pressed again.
   *
   * Not `children`: that is part of the question, and this is the answer to the
   * last time it was answered.
   */
  error?: ReactNode
  /** Anything the question needs beyond its description. */
  children?: ReactNode
}
