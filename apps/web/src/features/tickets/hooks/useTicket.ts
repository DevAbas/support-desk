import { skipToken, useQuery, type UseQueryResult } from '@tanstack/react-query'
import { getTicket } from '@/lib/api/tickets'
import type { Ticket } from '@support-desk/shared'
import { ticketKeys } from '@/features/tickets/ticketKeys'

/**
 * One ticket and its comments.
 *
 * The id comes from the route, so it can be missing. `skipToken` holds the
 * query back in that case without widening the id inside the query function to
 * something that has to be asserted away.
 */
export function useTicket(id: string | undefined): UseQueryResult<Ticket, Error> {
  return useQuery({
    // Unused while the query is held back: nothing is read or written under it.
    queryKey: ticketKeys.detail(id ?? ''),
    queryFn: id === undefined ? skipToken : ({ signal }) => getTicket(id, signal),
  })
}
