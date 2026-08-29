import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, CardBody, CardFooter, CardHeader, Input, Select, Textarea } from '@harness-sample/ui'
import { useCreateTicket } from './hooks/useCreateTicket'
import { TICKET_PRIORITIES, TICKET_PRIORITY_LABELS, type TicketPriority } from '@harness-sample/shared'

const priorityOptions = TICKET_PRIORITIES.map((priority) => ({
  value: priority,
  label: TICKET_PRIORITY_LABELS[priority],
}))

const MIN_TITLE_LENGTH = 5

interface FormValues {
  title: string
  description: string
  priority: TicketPriority | ''
  assignee: string
}

type FormErrors = Partial<Record<keyof FormValues, string>>

const emptyValues: FormValues = {
  title: '',
  description: '',
  priority: '',
  assignee: '',
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {}

  if (values.title.trim() === '') {
    errors.title = 'A title is required.'
  } else if (values.title.trim().length < MIN_TITLE_LENGTH) {
    errors.title = `Use at least ${MIN_TITLE_LENGTH} characters so the ticket is searchable.`
  }

  if (values.description.trim() === '') {
    errors.description = 'Describe what happened so an agent can pick this up.'
  }

  if (values.priority === '') {
    errors.priority = 'Choose a priority.'
  }

  if (values.assignee.trim() === '') {
    errors.assignee = 'Assign the ticket, or enter "Unassigned".'
  }

  return errors
}

export function NewTicketPage() {
  const navigate = useNavigate()
  const createTicket = useCreateTicket()
  const [values, setValues] = useState<FormValues>(emptyValues)
  const [errors, setErrors] = useState<FormErrors>({})

  function update<TField extends keyof FormValues>(field: TField, value: FormValues[TField]) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors = validate(values)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0 || values.priority === '') {
      return
    }

    const ticket = await createTicket.mutateAsync({
      title: values.title.trim(),
      description: values.description.trim(),
      priority: values.priority,
      assignee: values.assignee.trim(),
    })

    navigate(`/tickets/${ticket.id}`)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-fg">New ticket</h1>
        <p className="text-sm text-fg-muted">Log a support request on behalf of a customer.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <Card>
          <CardHeader title="Ticket details" />

          <CardBody className="flex flex-col gap-4">
            <Input
              label="Title"
              value={values.title}
              error={errors.title}
              placeholder="Short summary of the problem"
              onChange={(event) => update('title', event.target.value)}
            />

            <Textarea
              label="Description"
              value={values.description}
              error={errors.description}
              placeholder="What happened, what was expected, and how to reproduce it"
              onChange={(event) => update('description', event.target.value)}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Priority"
                options={priorityOptions}
                value={values.priority}
                error={errors.priority}
                placeholder="Choose a priority"
                onChange={(event) => update('priority', event.target.value as TicketPriority | '')}
              />

              <Input
                label="Assignee"
                value={values.assignee}
                error={errors.assignee}
                placeholder="Who should pick this up?"
                onChange={(event) => update('assignee', event.target.value)}
              />
            </div>
          </CardBody>

          <CardFooter>
            <Button variant="secondary" onClick={() => navigate('/tickets')} disabled={createTicket.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTicket.isPending}>
              {createTicket.isPending ? 'Creating…' : 'Create ticket'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
