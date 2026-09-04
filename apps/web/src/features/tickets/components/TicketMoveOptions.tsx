import type { UseQueryResult } from '@tanstack/react-query'
import { Alert, Button, CardBody, StateMessage } from '@support-desk/ui'
import {
  evaluateTicketMove,
  ticketTransitionsFrom,
  TICKET_STATUS_LABELS,
  type Role,
  type TicketMoveOffersResponse,
  type TicketMoveSubject,
  type TicketTransition,
} from '@support-desk/shared'
import { toErrorMessage } from '@/lib/api/http'
import { TicketMoveButton } from './TicketMoveButton'

interface TicketMoveOptionsProps {
  /** The answer to "what can be done here", in whatever state it is in. */
  moves: UseQueryResult<TicketMoveOffersResponse, Error>
  /** The ticket the offers are about, for the sentence shown when there are none. */
  ticket: TicketMoveSubject
  /** Who is looking, for the same sentence. */
  role: Role
  isBusy: boolean
  onSelect: (transition: TicketTransition) => void
}

/**
 * Why there is nothing on offer.
 *
 * An empty list is not a ticket at a dead end. `ticketMoveOffers` drops the
 * moves this role may not make, and every status has a move out of it, so the
 * list comes back empty in exactly one situation: an agent looking at a closed
 * ticket, where `reopen` is the only way on and reopening is administrators'
 * work. Answering that with "there is nowhere to take this ticket" names the
 * wrong reason — the ticket can be taken somewhere, just not by the person
 * reading it.
 *
 * So the workflow is asked, and it answers with the sentence the server would
 * have answered a click with: "Reopen is for administrators." Keeping a second
 * sentence here would be keeping one to drift from that one.
 *
 * The dead end is still a real state — a status nothing leads out of — and the
 * fallback is what says so, honestly, on the day one exists.
 */
function whyNothingIsOffered(ticket: TicketMoveSubject, role: Role): string {
  const refusals = ticketTransitionsFrom(ticket.status)
    .map((transition) => evaluateTicketMove(transition.id, { ticket, reason: '' }, role))
    .flatMap((verdict) => (verdict.allowed ? [] : [verdict.refusal.requirement]))

  return (
    refusals.at(0) ??
    `There is nowhere to take a ${TICKET_STATUS_LABELS[ticket.status].toLowerCase()} ticket from here.`
  )
}

/**
 * The four states of "what can be done here", each with one way out.
 *
 * Its own component rather than three branches inside `TicketMovesCard`,
 * because the states are exclusive and early returns say so where nested
 * ternaries do not. It also stops the card claiming two things at once: a
 * failed request used to be reported *and* answered with "there is nowhere to
 * take this ticket", which is a card disagreeing with itself about whether it
 * knows anything.
 *
 * Loading wins over empty, the way `List` and `TableBody` have it: nothing
 * having arrived yet is not the same as there being nothing.
 */
export function TicketMoveOptions({
  moves,
  ticket,
  role,
  isBusy,
  onSelect,
}: TicketMoveOptionsProps) {
  if (moves.isPending) {
    return <StateMessage isLoading>{'Loading moves…'}</StateMessage>
  }

  if (moves.isError) {
    return (
      <Alert
        tone="danger"
        variant="band"
        action={
          <Button variant="secondary" size="sm" onClick={() => void moves.refetch()}>
            Try again
          </Button>
        }
      >
        {toErrorMessage(moves.error, 'Could not load what can be done with this ticket.')}
      </Alert>
    )
  }

  if (moves.data.moves.length === 0) {
    return <StateMessage>{whyNothingIsOffered(ticket, role)}</StateMessage>
  }

  return (
    <CardBody className="flex flex-col gap-4">
      {moves.data.moves.map((offer) => (
        <TicketMoveButton key={offer.id} offer={offer} isBusy={isBusy} onSelect={onSelect} />
      ))}
    </CardBody>
  )
}
