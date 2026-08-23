import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import type { DeletedCount } from '@harness-sample/shared'
import { deleteTicket } from '@/lib/api/tickets'
import { ticketKeys } from '@/features/tickets/ticketKeys'

/**
 * The detail entry is dropped rather than invalidated. Invalidating it would
 * refetch a ticket that no longer exists and leave a 404 in the cache for the
 * screen that is on its way out.
 */
export function useDeleteTicket(): UseMutationResult<DeletedCount, Error, string> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteTicket,
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: ticketKeys.detail(id) })
      return queryClient.invalidateQueries({ queryKey: ticketKeys.lists() })
    },
  })
}
