import { Button } from '../../primitives/Button'
import { Modal } from '../Modal'
import type { ConfirmDialogProps } from './ConfirmDialog.types'

/**
 * "Are you sure?", once.
 *
 * A modal, a secondary Cancel, and a confirming button that says what it will
 * do — the shape was hand-built at every destructive action in the app, and the
 * copies had already drifted: two disabled both buttons while the mutation was
 * in flight and one did not, so one of them could be fired twice by a double
 * click. Behaviour that is written three times is behaviour that is right in
 * some of them.
 *
 * It is a `Modal` rather than a `Dialog` of its own, because a confirmation is
 * the thing a modal is for: it interrupts, and it does not go away until it is
 * answered.
 */
export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  onConfirm,
  confirmLabel,
  cancelLabel = 'Cancel',
  isDanger = false,
  isBusy = false,
  busyLabel,
  children,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isBusy}>
            {cancelLabel}
          </Button>
          <Button variant={isDanger ? 'danger' : 'primary'} onClick={onConfirm} disabled={isBusy}>
            {isBusy ? (busyLabel ?? confirmLabel) : confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  )
}
