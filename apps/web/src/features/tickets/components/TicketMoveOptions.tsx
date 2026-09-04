import type { UseQueryResult } from '@tanstack/react-query'
import { Alert, Button, CardBody, StateMessage } from '@support-desk/ui'
import {
  TICKET_STATUS_LABELS,
  type TicketMoveOffersResponse,
  type TicketStatus,
  type TicketTransition,
} from '@support-desk/shared'
import { toErrorMessage } from '@/lib/api/http'
import { TicketMoveButton } from './TicketMoveButton'

interface TicketMoveOptionsProps {
  /** The answer to "what can be done here", in whatever state it is in. */
  moves: UseQueryResult<TicketMoveOffersResponse, Error>
  /** Where the ticket is, for the sentence shown when there is nowhere to go. */
  status: TicketStatus
  isBusy: boolean
  onSelect: (transition: TicketTransition) => void
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
export function TicketMoveOptions({ moves, status, isBusy, onSelect }: TicketMoveOptionsProps) {
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
    return (
      <StateMessage>
        {`There is nowhere to take a ${TICKET_STATUS_LABELS[status].toLowerCase()} ticket from here.`}
      </StateMessage>
    )
  }

  return (
    <CardBody className="flex flex-col gap-4">
      {moves.data.moves.map((offer) => (
        <TicketMoveButton key={offer.id} offer={offer} isBusy={isBusy} onSelect={onSelect} />
      ))}
    </CardBody>
  )
}
