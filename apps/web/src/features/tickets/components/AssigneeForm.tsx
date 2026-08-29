import { useState, type FormEvent } from 'react'
import { Button, Input } from '@harness-sample/ui'
import { toErrorMessage } from '@/lib/api/http'

interface AssigneeFormProps {
  /** Who the ticket is assigned to, as the server last reported it. */
  assignee: string
  onSubmit: (assignee: string) => Promise<void>
  disabled?: boolean
}

/**
 * Reassignment on the detail page.
 *
 * An assignee is free text in the domain — there is no roster to pick from —
 * so this is a field and an explicit save rather than the immediate write the
 * status dropdown does. A name typed one character at a time is not a series of
 * reassignments.
 */
export function AssigneeForm({ assignee, onSubmit, disabled = false }: AssigneeFormProps) {
  const [value, setValue] = useState(assignee)
  const [savedAssignee, setSavedAssignee] = useState(assignee)
  const [error, setError] = useState<string | undefined>(undefined)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // The saved assignee can move under the form: a refetch, or this form's own
  // save resolving to the trimmed name rather than the one in the field. A
  // field labelled "Assigned to" that disagrees with the ticket is worse than
  // one that drops an edit, so it is re-seeded when that happens.
  if (assignee !== savedAssignee) {
    setSavedAssignee(assignee)
    setValue(assignee)
    setError(undefined)
  }

  const nextAssignee = value.trim()
  const isUnchanged = nextAssignee === assignee

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (nextAssignee === '') {
      setError('Assign the ticket, or enter "Unassigned".')
      return
    }

    setError(undefined)
    setIsSubmitting(true)

    try {
      await onSubmit(nextAssignee)
    } catch (cause: unknown) {
      setError(toErrorMessage(cause, 'Could not reassign this ticket.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Input
        label="Assigned to"
        value={value}
        error={error}
        disabled={disabled || isSubmitting}
        placeholder="Who should pick this up?"
        onChange={(event) => setValue(event.target.value)}
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={disabled || isSubmitting || isUnchanged}>
          {isSubmitting ? 'Reassigning…' : 'Reassign'}
        </Button>
      </div>
    </form>
  )
}
