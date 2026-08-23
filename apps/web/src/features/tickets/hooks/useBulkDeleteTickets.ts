import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import type { BulkDeleteBody, DeletedCount } from '@harness-sample/shared'
import { bulkDeleteTickets } from '@/lib/api/tickets'
import { ticketKeys } from '@/features/tickets/ticketKeys'

/** As with a single delete, the detail entries go rather than being refetched. */
export function useBulkDeleteTickets(): UseMutationResult<DeletedCount, Error, BulkDeleteBody> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: bulkDeleteTickets,
    onSuccess: (_result, { ids }) => {
      for (const id of ids) {
        queryClient.removeQueries({ queryKey: ticketKeys.detail(id) })
      }

      return queryClient.invalidateQueries({ queryKey: ticketKeys.lists() })
    },
  })
}
