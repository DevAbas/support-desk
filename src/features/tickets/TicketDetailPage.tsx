import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, Card, CardBody, CardHeader, Modal, Select } from '../../design-system'
import { toErrorMessage } from '../../lib/api/http'
import { formatDateTime } from '../../lib/format'
import {
  TICKET_STATUSES,
  TICKET_STATUS_LABELS,
  type TicketStatus,
} from '../../lib/types'
import { ROLE_LABELS } from '../roles/role.types'
import { useRole } from '../roles/useRole'
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
    return (
      <p role="status" aria-live="polite" className="text-sm text-fg-muted">
        Loading ticket…
      </p>
    )
  }

  if (error || !ticket) {
    return (
      <Card>
        <CardBody className="flex flex-col items-start gap-3">
          <p className="text-sm text-danger">{error ?? 'This ticket could not be found.'}</p>
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
          className="text-sm text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          &#8592; Back to tickets
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <p className="font-mono text-xs text-fg-muted">{ticket.id}</p>
            <h1 className="text-2xl font-semibold text-fg">{ticket.title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <TicketStatusBadge status={ticket.status} />
              <TicketPriorityBadge priority={ticket.priority} />
              <span className="text-sm text-fg-muted">
                Opened {formatDateTime(ticket.createdAt)} · Assigned to {ticket.assignee}
              </span>
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
              <p className="text-sm text-fg-muted">{ticket.description}</p>
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

        <Card className="h-fit">
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
      </div>

      <Modal
        open={isConfirmingDelete}
        onClose={() => setIsConfirmingDelete(false)}
        title="Delete this ticket"
        description={`${ticket.id} will be permanently removed. This cannot be undone.`}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsConfirmingDelete(false)}
              disabled={deleteTicket.isPending}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleteTicket.isPending}>
              {deleteTicket.isPending ? 'Deleting…' : 'Delete ticket'}
            </Button>
          </>
        }
      />
    </div>
  )
}
