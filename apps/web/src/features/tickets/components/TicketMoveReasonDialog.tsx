import { useId, useState, type SubmitEventHandler } from 'react'
import { Button, Modal, Textarea } from '@support-desk/ui'
import { MAX_MOVE_REASON_LENGTH, TICKET_GUARDS, type TicketTransition } from '@support-desk/shared'

interface TicketMoveReasonDialogProps {
  transition: TicketTransition
  isBusy: boolean
  onConfirm: (reason: string) => void
  onClose: () => void
}

/**
 * Asks why, for the moves that take a ticket backwards.
 *
 * A `Modal` rather than a field in the card, because this is a question that has
 * to be answered before the move happens — the ticket does not go anywhere until
 * it is. A `Drawer` accompanies and a field waits; neither is what "say why, and
 * then this will happen" is.
 *
 * Mounted only while it is open, so the field starts empty every time without an
 * effect to clear it — the same trade `SavedViewNameDialog` makes.
 *
 * The sentence shown for an empty reason is the guard's own, so the message a
 * person reads is the same one the server would have answered with. Two
 * spellings of one condition is one spelling and a future disagreement.
 */
export function TicketMoveReasonDialog({
  transition,
  isBusy,
  onConfirm,
  onClose,
}: TicketMoveReasonDialogProps) {
  const formId = useId()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()

    const trimmed = reason.trim()

    if (trimmed === '') {
      setError(TICKET_GUARDS.reason.requirement)
      return
    }

    onConfirm(trimmed)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={transition.label}
      description={transition.description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isBusy}>
            Cancel
          </Button>
          {/* Outside the form element, tied to it by id, so Enter submits too. */}
          <Button type="submit" form={formId} disabled={isBusy}>
            {isBusy ? 'Moving…' : transition.label}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit}>
        <Textarea
          label="Why"
          value={reason}
          error={error ?? undefined}
          maxLength={MAX_MOVE_REASON_LENGTH}
          disabled={isBusy}
          placeholder="What has to happen to this ticket, and why it is coming back"
          onChange={(event) => {
            setReason(event.target.value)
            setError(null)
          }}
        />
      </form>
    </Modal>
  )
}
