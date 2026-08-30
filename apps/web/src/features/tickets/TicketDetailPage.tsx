import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  Heading,
  Icon,
  Select,
  StateMessage,
  Text,
} from '@harness-sample/ui'
import { toErrorMessage } from '@/lib/api/http'
import { formatDateTime } from '@/lib/format'
import {
  TICKET_STATUSES,
  TICKET_STATUS_LABELS,
  type TicketStatus,
} from '@harness-sample/shared'
import { ROLE_LABELS } from '@/features/roles/role.types'
import { useRole } from '@/features/roles/useRole'
import { AssigneeForm } from './components/AssigneeForm'
import { CommentForm } from './components/CommentForm'
import { CommentList } from './components/CommentList'
import { TicketPriorityBadge } from './components/TicketPriorityBadge'
import { TicketStatusBadge } from './components/TicketStatusBadge'
import { useAddComment } from './hooks/useAddComment'
import { useDeleteTicket } from './hooks/useDeleteTicket'
import { useTicket } from './hooks/useTicket'
import { useUpdateTicket } from './hooks/useUpdateTicket'

const statusOptions = TICKET_STATUSES.map((status) => ({
  value: status,
  label: TICKET_STATUS_LABELS[status],
}))

export function TicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>()
  const navigate = useNavigate()
  const { role, canManageTickets } = useRole()

  const query = useTicket(ticketId)
  const updateTicket = useUpdateTicket()
  const addComment = useAddComment()
  const deleteTicket = useDeleteTicket()

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

  const ticket = query.data

  // No id means a route that cannot be satisfied, so the query never runs and
  // there is nothing to retry — the message stands in for a request failure.
  const error =
    ticketId === undefined
      ? 'No ticket was requested.'
      : query.isError
        ? toErrorMessage(query.error, 'Could not load this ticket.')
        : null

  function handleStatusChange(nextStatus: TicketStatus) {
    if (ticket) {
      updateTicket.mutate({ id: ticket.id, patch: { status: nextStatus } })
    }
  }

  async function handleReassign(assignee: string) {
    if (ticket) {
      await updateTicket.mutateAsync({ id: ticket.id, patch: { assignee } })
    }
  }

  async function handleAddComment(body: string) {
    if (ticket) {
      await addComment.mutateAsync({
        id: ticket.id,
        body: { author: `You (${ROLE_LABELS[role]})`, body },
      })
    }
  }

  function handleDelete() {
    if (ticket) {
      deleteTicket.mutate(ticket.id, { onSuccess: () => navigate('/tickets') })
    }
  }

  if (ticketId !== undefined && query.isPending) {
    return <StateMessage isLoading>Loading ticket…</StateMessage>
  }

  if (error || !ticket) {
    return (
      <Card>
        <CardBody className="flex flex-col items-start gap-3">
          <Text className="text-danger">{error ?? 'This ticket could not be found.'}</Text>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => void query.refetch()}>
              Try again
            </Button>
            <Button variant="ghost" onClick={() => navigate('/tickets')}>
              Back to tickets
            </Button>
          </div>
        </CardBody>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link
          to="/tickets"
          className="inline-flex items-center gap-1 text-sm text-primary underline-offset-2 hover:underline focus-ring"
        >
          {/* Decorative: the direction is already in the words beside it, and
              an arrow inside the link text is read out as part of its name. */}
          <Icon name="arrow-left" size="sm" label="Back" decorative />
          Back to tickets
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Text size="caption" tone="muted" className="font-mono">
              {ticket.id}
            </Text>
            <Heading level="page">{ticket.title}</Heading>
            <div className="flex flex-wrap items-center gap-2">
              <TicketStatusBadge status={ticket.status} />
              <TicketPriorityBadge priority={ticket.priority} />
              <Text as="span" tone="muted">
                Opened {formatDateTime(ticket.createdAt)} · Assigned to {ticket.assignee}
              </Text>
            </div>
          </div>

          {canManageTickets ? (
            <Button variant="danger" onClick={() => setIsConfirmingDelete(true)}>
              Delete ticket
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader title="Description" />
            <CardBody>
              {/* Free text someone typed, so it wraps anywhere it has to: one
                  unbroken URL in here used to widen the column and the page. */}
              <Text tone="muted">{ticket.description}</Text>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Comments"
              description={`${ticket.comments.length} ${
                ticket.comments.length === 1 ? 'comment' : 'comments'
              }`}
            />
            <CardBody className="flex flex-col gap-6">
              <CommentList comments={ticket.comments} />
              <CommentForm onSubmit={handleAddComment} />
            </CardBody>
          </Card>
        </div>

        <div className="flex h-fit flex-col gap-6">
          <Card>
            <CardHeader title="Status" />
            <CardBody>
              <Select
                label="Current status"
                options={statusOptions}
                value={ticket.status}
                disabled={updateTicket.isPending}
                hint={updateTicket.isPending ? 'Saving…' : 'Changes are saved immediately.'}
                onChange={(event) => handleStatusChange(event.target.value as TicketStatus)}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Assignee" description="Hand this ticket to someone else." />
            <CardBody>
              <AssigneeForm
                assignee={ticket.assignee}
                disabled={updateTicket.isPending}
                onSubmit={handleReassign}
              />
            </CardBody>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={isConfirmingDelete}
        onClose={() => setIsConfirmingDelete(false)}
        onConfirm={handleDelete}
        title="Delete this ticket"
        description={`${ticket.id} will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete ticket"
        busyLabel="Deleting…"
        isDanger
        isBusy={deleteTicket.isPending}
      />
    </div>
  )
}
