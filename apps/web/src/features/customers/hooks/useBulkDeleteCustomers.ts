import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import type { BulkDeleteCustomersBody, DeletedCount } from '@harness-sample/shared'
import { bulkDeleteCustomers } from '@/lib/api/customers'
import { customerKeys } from '@/features/customers/customerKeys'

/**
 * Removes a selection of customers.
 *
 * The detail entries are dropped rather than refetched, as with a deleted
 * ticket: there is nothing at the other end of those keys any more, and
 * invalidating them would ask the server to confirm it with sixty 404s.
 *
 * The queue is untouched. Deleting a customer takes the link to their tickets,
 * not the tickets — see `customerStore.ts` — so nothing here invalidates a
 * ticket key.
 */
export function useBulkDeleteCustomers(): UseMutationResult<
  DeletedCount,
  Error,
  BulkDeleteCustomersBody
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: bulkDeleteCustomers,
    onSuccess: (_result, { ids }) => {
      for (const id of ids) {
        queryClient.removeQueries({ queryKey: customerKeys.detail(id) })
      }

      return queryClient.invalidateQueries({ queryKey: customerKeys.lists() })
    },
  })
}
