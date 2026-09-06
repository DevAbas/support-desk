import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import type { CustomerPlan, CustomerPlanRow, UpdateCustomerPlanBody } from '@support-desk/shared'
import { updateCustomerPlan } from '@/lib/api/plans'
import { planKeys } from '@/features/plans/planKeys'

export interface UpdateCustomerPlanVariables {
  plan: CustomerPlan
  terms: UpdateCustomerPlanBody
}

/**
 * Re-prices one plan.
 *
 * The whole catalogue is invalidated rather than the row that changed, and that
 * is the ladder rather than laziness: the rules compare a plan against its
 * neighbours, so an edit that is accepted is an edit the plans on either side
 * are now known to sit correctly against. Patching one row into the cache would
 * leave the screen showing three rows nobody has re-checked.
 *
 * Nothing in `customerKeys` is touched. A plan's price is not a fact about any
 * customer — nobody moves plan because the price moved — so a customer list
 * cached beside this one is still correct.
 */
export function useUpdateCustomerPlan(): UseMutationResult<
  CustomerPlanRow,
  Error,
  UpdateCustomerPlanVariables
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ plan, terms }: UpdateCustomerPlanVariables) => updateCustomerPlan(plan, terms),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: planKeys.all() }),
  })
}
