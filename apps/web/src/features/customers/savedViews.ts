import { z } from 'zod'
import { customerPlanSchema, plansInDomainOrder } from '@support-desk/shared'
import type { SavedViewScope } from '@/features/savedViews/savedViews.types'
import { DEFAULT_FILTERS, type CustomerFilters } from './customerFilters'

/**
 * The customer list's saved views: this screen's filters, described to the
 * shared mechanism in `features/savedViews`.
 *
 * This file is the whole of what saved views on the customer list cost, and that
 * is the point of the mechanism: the storage, the sidebar, the naming dialog,
 * which view is selected and whether the filters have drifted from it are all
 * shared. What is here is what the mechanism cannot know — these filters are a
 * set rather than a widened single value, so the domain check and the canonical
 * form are this screen's own.
 */

export const CUSTOMER_SAVED_VIEWS_STORAGE_KEY = 'support-desk.saved-views.customers'

export const CUSTOMER_SAVED_VIEWS: SavedViewScope<CustomerFilters> = {
  storageKey: CUSTOMER_SAVED_VIEWS_STORAGE_KEY,
  allLabel: 'All customers',
  filtersDescription: 'The plans and search on screen are stored under this name.',
  defaultFilters: DEFAULT_FILTERS,
  normaliseFilters,
  parseFilters,
}

/**
 * Plans in domain order, and the search trimmed.
 *
 * The order matters here in a way it does not on the ticket screen: "Pro and
 * Enterprise" and "Enterprise and Pro" are one question, and a set filter has no
 * business calling a saved view modified because the boxes were ticked the other
 * way round. `MultiSelect` already emits in `options` order, so what this is for
 * is a view stored by some other build. The rule itself is `plansInDomainOrder`
 * in the shared contract, which is also what a list query is put through: a
 * stored view and a request cannot disagree about which order is the order.
 * Trimming is for the reason `listCustomers` trims: a trailing space is not a
 * different question.
 */
function normaliseFilters(filters: CustomerFilters): CustomerFilters {
  return {
    plans: plansInDomainOrder(filters.plans),
    search: filters.search.trim(),
  }
}

/**
 * What a stored view's filters have to be to still be a set of plans.
 *
 * `customerPlanSchema` is the plan, here as everywhere: the domain is one list
 * and a hand-written check beside it is the one that goes stale the day a tier
 * moves. `z.array` fails whole rather than per entry, which is the behaviour
 * this wants — a view naming a tier that has since been removed is dropped, not
 * quietly narrowed to the tiers that are left, because narrowed it would come
 * back as a different question under the same name.
 */
const storedFiltersSchema = z.object({
  plans: z.array(customerPlanSchema),
  search: z.string(),
})

function parseFilters(value: unknown): CustomerFilters | null {
  const parsed = storedFiltersSchema.safeParse(value)

  return parsed.success ? normaliseFilters(parsed.data) : null
}
