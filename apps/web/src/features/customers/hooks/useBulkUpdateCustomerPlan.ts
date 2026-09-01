import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import type { BulkUpdateCustomerPlanBody, UpdatedCount } from '@support-desk/shared'
import { bulkUpdateCustomerPlan } from '@/lib/api/customers'
import { customerKeys } from '@/features/customers/customerKeys'

/**
 * Moves a selection of customers onto one plan.
 *
 * Every list is invalidated, but only the details of the customers that were
 * actually in the selection — the same division `useBulkUpdateStatus` makes, for
 * the same reason: a customer nobody ticked keeps its cached copy.
 *
 * Invalidating the lists refetches every page the infinite query holds, not just
 * the first. That is what keeps a row moved on page one consistent with a
 * selection still ticked on page three.
 */
export function useBulkUpdateCustomerPlan(): UseMutationResult<
  UpdatedCount,
  Error,
  BulkUpdateCustomerPlanBody
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: bulkUpdateCustomerPlan,
    onSuccess: (_result, { ids }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: customerKeys.lists() }),
        ...ids.map((id) => queryClient.invalidateQueries({ queryKey: customerKeys.detail(id) })),
      ]),
  })
}
