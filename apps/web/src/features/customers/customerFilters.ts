import type { SelectOption } from '@harness-sample/ui'
import {
  CUSTOMER_PLANS,
  CUSTOMER_PLAN_LABELS,
  type CustomerPlan,
  type ListCustomersFilters,
} from '@harness-sample/shared'

/**
 * The filter combination the customer list is showing.
 *
 * There is no `all` here, and there is deliberately none. The ticket filters
 * widen their domain unions with `'all'` because a single-value filter has no
 * other way to say "do not filter on this"; a set of plans already has one, and
 * it is the empty set. See `ticketFilters.ts` for the other pattern — both are
 * in this repo on purpose.
 */

export interface CustomerFilters {
  /** Empty means every plan, not no plan. */
  plans: CustomerPlan[]
  search: string
}

export const DEFAULT_FILTERS: CustomerFilters = {
  plans: [],
  search: '',
}

export const planFilterOptions: readonly SelectOption<CustomerPlan>[] = CUSTOMER_PLANS.map(
  (plan) => ({ value: plan, label: CUSTOMER_PLAN_LABELS[plan] }),
)

/**
 * The filters as the list endpoint wants them, minus the cursor: which page is
 * being asked for is not a filter, and this is what the cache key is built from.
 *
 * Every field is named, so a filter added to the contract is a compile error
 * here rather than one the request — and the key built from it — quietly
 * ignores. The search term is trimmed because the server trims it too: a
 * trailing space is not a different question and should not be a second cache
 * entry.
 */
export function toListCustomersFilters(
  filters: CustomerFilters,
  limit: number,
): ListCustomersFilters {
  return {
    plans: filters.plans,
    search: filters.search.trim(),
    limit,
  }
}
