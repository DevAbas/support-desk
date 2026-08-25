import { useId, useState, type FormEvent } from 'react'
import { Button, Input, Modal } from '@/design-system'

interface CustomerSegmentNameDialogProps {
  title: string
  description?: string
  confirmLabel: string
  initialName?: string
  /** Names already in use, so two segments cannot end up sharing one. */
  takenNames: readonly string[]
  onConfirm: (name: string) => void
  onClose: () => void
}

/**
 * Names a segment, for both saving a new one and renaming an existing one.
 *
 * A `Modal` rather than the `Drawer` the rest of this screen opens: naming
 * something is a question that has to be answered before anything else happens,
 * which is the difference between the two dialogs.
 *
 * Mounted only while it is open, so the field starts from `initialName` every
 * time without an effect to reset it.
 */
export function CustomerSegmentNameDialog({
  title,
  description,
  confirmLabel,
  initialName = '',
  takenNames,
  onConfirm,
  onClose,
}: CustomerSegmentNameDialogProps) {
  const formId = useId()
  const [name, setName] = useState(initialName)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmed = name.trim()

    if (trimmed === '') {
      setError('Give the segment a name.')
      return
    }

    if (takenNames.some((taken) => taken.toLowerCase() === trimmed.toLowerCase())) {
      setError('A segment with that name already exists.')
      return
    }

    onConfirm(trimmed)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          {/* Outside the form element, tied to it by id, so Enter submits too. */}
          <Button type="submit" form={formId}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit}>
        <Input
          label="Segment name"
          value={name}
          placeholder="e.g. Enterprise, no tickets yet"
          error={error ?? undefined}
          onChange={(event) => {
            setName(event.target.value)
            setError(null)
          }}
        />
      </form>
    </Modal>
  )
}
