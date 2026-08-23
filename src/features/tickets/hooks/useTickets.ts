import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { ListTicketsQuery, ListTicketsResponse } from '../../../lib/api/contract'
import { listTickets } from '../../../lib/api/tickets'
import { ticketKeys } from '../ticketKeys'

/**
 * A page of the queue.
 *
 * The previous page is kept on screen while the next one loads, so changing a
 * filter — or typing another character into the search box — does not empty the
 * table and then fill it again. `isPending` is therefore true only on the very
 * first load, when there is genuinely nothing to show; `isFetching` is what to
 * disable controls on.
 */
export function useTickets(query: ListTicketsQuery): UseQueryResult<ListTicketsResponse, Error> {
  return useQuery({
    queryKey: ticketKeys.list(query),
    queryFn: ({ signal }) => listTickets(query, signal),
    placeholderData: keepPreviousData,
  })
}
