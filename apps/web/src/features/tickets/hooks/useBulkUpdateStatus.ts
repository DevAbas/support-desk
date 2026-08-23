import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import type { BulkUpdateBody, UpdatedCount } from '@harness-sample/shared'
import { bulkUpdateStatus } from '@/lib/api/tickets'
import { ticketKeys } from '@/features/tickets/ticketKeys'

/**
 * Every list is invalidated, but only the details of the tickets that were
 * actually in the selection — a ticket nobody ticked keeps its cached copy.
 */
export function useBulkUpdateStatus(): UseMutationResult<UpdatedCount, Error, BulkUpdateBody> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: bulkUpdateStatus,
    onSuccess: (_result, { ids }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ticketKeys.lists() }),
        ...ids.map((id) =>
          queryClient.invalidateQueries({ queryKey: ticketKeys.detail(id) }),
        ),
      ]),
  })
}
