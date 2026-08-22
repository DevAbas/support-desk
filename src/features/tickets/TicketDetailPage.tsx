import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, Card, CardBody, CardHeader, Modal, Select } from '../../design-system'
import { addComment, deleteTicket, updateTicketStatus } from '../../lib/api'
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
import { useTicket } from './hooks/useTicket'

const statusOptions = TICKET_STATUSES.map((status) => ({
  value: status,
  label: TICKET_STATUS_LABELS[status],
}))

export function TicketDetailPage() {
  const { ticketId } = useParams<{ ticketId: string }>()
  const navigate = useNavigate()
  const { role, canManageTickets } = useRole()
  const { ticket, isLoading, error, setTicket, reload } = useTicket(ticketId)

  const [isSavingStatus, setIsSavingStatus] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleStatusChange(nextStatus: TicketStatus) {
    if (!ticket) {
      return
    }

    setIsSavingStatus(true)

    try {
      setTicket(await updateTicketStatus(ticket.id, nextStatus))
    } finally {
      setIsSavingStatus(false)
    }
  }

  async function handleAddComment(body: string) {
    if (!ticket) {
      return
    }

    setTicket(await addComment(ticket.id, { author: `You (${ROLE_LABELS[role]})`, body }))
  }

  async function handleDelete() {
    if (!ticket) {
      return
    }

    setIsDeleting(true)

    try {
      await deleteTicket(ticket.id)
      navigate('/tickets')
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
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
            <Button variant="secondary" onClick={reload}>
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
              disabled={isSavingStatus}
              hint={isSavingStatus ? 'Saving…' : 'Changes are saved immediately.'}
              onChange={(event) => void handleStatusChange(event.target.value as TicketStatus)}
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
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting…' : 'Delete ticket'}
            </Button>
          </>
        }
      />
    </div>
  )
}
