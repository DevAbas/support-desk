import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import type { BulkTicketMoveBody, BulkTicketMoveResponse } from '@support-desk/shared'
import { bulkMoveTickets } from '@/lib/api/tickets'
import { ticketKeys } from '@/features/tickets/ticketKeys'

/**
 * The same move across a selection.
 *
 * Every list is invalidated, and only the tickets the server says it moved have
 * their detail and their moves dropped. A ticket that was left where it was is
 * still exactly what the cache says it is, and refetching it would be asking a
 * question that has already been answered — by the refusal that came back.
 */
export function useBulkMoveTickets(): UseMutationResult<
  BulkTicketMoveResponse,
  Error,
  BulkTicketMoveBody
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: bulkMoveTickets,
    onSuccess: (result) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ticketKeys.lists() }),
        ...result.moved.flatMap((id) => [
          queryClient.invalidateQueries({ queryKey: ticketKeys.detail(id) }),
          queryClient.invalidateQueries({ queryKey: ticketKeys.movesFor(id) }),
        ]),
      ]),
  })
}
