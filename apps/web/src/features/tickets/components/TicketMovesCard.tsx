import { useState } from 'react'
import { Alert, Card, CardHeader } from '@support-desk/ui'
import {
  ticketMoveNeedsReason,
  TICKET_STATUS_LABELS,
  type Ticket,
  type TicketTransition,
} from '@support-desk/shared'
import { toErrorMessage } from '@/lib/api/http'
import { useMoveTicket } from '../hooks/useMoveTicket'
import { useTicketMoves } from '../hooks/useTicketMoves'
import { TicketMoveOptions } from './TicketMoveOptions'
import { TicketMoveReasonDialog } from './TicketMoveReasonDialog'

interface TicketMovesCardProps {
  ticket: Ticket
}

/**
 * Where the ticket is, and what can be done to it next.
 *
 * This replaced a dropdown of all four statuses, which is the defect the
 * workflow exists for: it offered every value from every other, so a ticket
 * nobody had worked could be closed, and a closed one could be opened again with
 * one click and no explanation.
 *
 * **It asks rather than works it out.** The moves come from
 * `GET /api/tickets/:id/moves`. The workflow is shared code and this card could
 * read it directly, but availability turns on ticket state the cache may be a
 * moment behind on and on a role rule that must not exist twice — so the server
 * answers and this draws the answer. What it does read out of the shared tables
 * is each move's label and whether committing it asks for a reason, which is
 * presentation and never was the server's to send.
 *
 * A refused move is reported here rather than swallowed, and it can happen from
 * a perfectly correct screen: the ticket may have moved under the person while
 * they were reading it. The band says which condition failed, not that the
 * click did not work.
 */
export function TicketMovesCard({ ticket }: TicketMovesCardProps) {
  const moves = useTicketMoves(ticket.id)
  const move = useMoveTicket()

  const [asking, setAsking] = useState<TicketTransition | null>(null)
  const [refusal, setRefusal] = useState<string | null>(null)

  function commit(transition: TicketTransition, reason?: string) {
    setRefusal(null)

    move.mutate(
      { id: ticket.id, body: { move: transition.id, reason } },
      {
        onSuccess: () => setAsking(null),
        onError: (cause) => {
          // The dialog closes on a refusal as well as on a success: what came
          // back is a condition no reason can satisfy — usually the ticket
          // having moved on — so leaving the field open would invite the same
          // sentence to be typed again.
          setAsking(null)
          setRefusal(toErrorMessage(cause, 'Could not move this ticket.'))
        },
      },
    )
  }

  function selectMove(transition: TicketTransition) {
    if (ticketMoveNeedsReason(transition.id)) {
      setAsking(transition)
      return
    }

    commit(transition)
  }

  return (
    <Card>
      <CardHeader
        title="Status"
        description={`This ticket is ${TICKET_STATUS_LABELS[ticket.status]}.`}
      />

      {refusal ? (
        <Alert tone="danger" variant="band">
          {refusal}
        </Alert>
      ) : null}

      <TicketMoveOptions
        moves={moves}
        status={ticket.status}
        isBusy={move.isPending}
        onSelect={selectMove}
      />

      {asking ? (
        <TicketMoveReasonDialog
          transition={asking}
          isBusy={move.isPending}
          onConfirm={(reason) => commit(asking, reason)}
          onClose={() => setAsking(null)}
        />
      ) : null}
    </Card>
  )
}
