import { skipToken, useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { TicketMoveOffersResponse } from '@support-desk/shared'
import { listTicketMoves } from '@/lib/api/tickets'
import { ticketKeys } from '@/features/tickets/ticketKeys'

/**
 * What can be done to this ticket, according to the server.
 *
 * A query of its own rather than a field on the ticket, because it is not part
 * of what a ticket *is*: the same ticket offers different moves to an agent and
 * to an admin, and every screen that renders a ticket would otherwise be
 * carrying an answer only this card reads.
 *
 * `skipToken` holds it back where there is no id, the same way `useTicket` does.
 */
export function useTicketMoves(
  id: string | undefined,
): UseQueryResult<TicketMoveOffersResponse, Error> {
  return useQuery({
    queryKey: ticketKeys.movesFor(id ?? ''),
    queryFn: id === undefined ? skipToken : ({ signal }) => listTicketMoves(id, signal),
  })
}
