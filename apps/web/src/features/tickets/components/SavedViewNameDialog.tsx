import { useId, useState, type SubmitEventHandler } from 'react'
import { Button, Input, Modal } from '@harness-sample/ui'

interface SavedViewNameDialogProps {
  title: string
  description?: string
  confirmLabel: string
  initialName?: string
  /** Names already in use, so two views cannot end up sharing one. */
  takenNames: readonly string[]
  onConfirm: (name: string) => void
  onClose: () => void
}

/**
 * Names a view, for both saving a new one and renaming an existing one.
 *
 * Mounted only while it is open, so the field starts from `initialName` every
 * time without an effect to reset it.
 */
export function SavedViewNameDialog({
  title,
  description,
  confirmLabel,
  initialName = '',
  takenNames,
  onConfirm,
  onClose,
}: SavedViewNameDialogProps) {
  const formId = useId()
  const [name, setName] = useState(initialName)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()

    const trimmed = name.trim()

    if (trimmed === '') {
      setError('Give the view a name.')
      return
    }

    if (takenNames.some((taken) => taken.toLowerCase() === trimmed.toLowerCase())) {
      setError('A view with that name already exists.')
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
          label="View name"
          value={name}
          placeholder="e.g. High priority, still open"
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
