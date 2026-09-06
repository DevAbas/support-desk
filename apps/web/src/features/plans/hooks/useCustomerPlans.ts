import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { ListCustomerPlansResponse } from '@support-desk/shared'
import { listCustomerPlans } from '@/lib/api/plans'
import { planKeys } from '@/features/plans/planKeys'

/**
 * Every plan, with the number of customers on each.
 *
 * No `placeholderData` and no keeping a previous answer on screen, unlike the
 * lists: there is one question here and it never changes, so there is no next
 * page and no new filter for a stale answer to sit under while it loads. The
 * only refetch is the one an edit triggers, and by then the table has the row.
 */
export function useCustomerPlans(): UseQueryResult<ListCustomerPlansResponse, Error> {
  return useQuery({
    queryKey: planKeys.list(),
    queryFn: ({ signal }) => listCustomerPlans(signal),
  })
}
