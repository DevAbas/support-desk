import { Button } from '../../primitives/Button'
import { Alert } from '../Alert'
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
 *
 * `error` is here rather than at each call site for the same reason `isBusy` is.
 * A confirmation fires a request that can fail while the dialog is still open,
 * and the dialog is `aria-modal` — the page behind it is, as far as a screen
 * reader is concerned, not there. So a failure reported on that page is reported
 * nowhere, and the call site that renders it into `children` instead has to
 * decide the tone, the shape and the position every time. There is one right
 * answer and this is where it goes.
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
  error,
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
      {/* Under the question rather than over it: the question has not changed,
          and this belongs against the button that will be pressed again. */}
      {children || error ? (
        <div className="flex flex-col gap-4">
          {children}
          {error ? <Alert tone="danger">{error}</Alert> : null}
        </div>
      ) : null}
    </Modal>
  )
}
