import { CUSTOMER_PLANS, type CustomerPlan } from '@support-desk/shared'
import type { SavedViewScope } from '@/features/savedViews/savedViews.types'
import { DEFAULT_FILTERS, type CustomerFilters } from './customerFilters'

/**
 * The customer list's saved views: this screen's filters, described to the
 * shared mechanism in `features/savedViews`.
 *
 * This file is the whole of what saved views on the customer list cost, and that
 * is the point of the mechanism. Nothing below is a copy of the ticket screen's
 * scope with the strings changed — the filters here are a set rather than a
 * widened single value, so the domain check and the canonical form are genuinely
 * different, and they are the only two things that are.
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
 * way round. `MultiSelect` already emits in `options` order, so this is what
 * keeps that true of a view stored by some other build as well as of one stored
 * by this one. Trimming is for the reason `listCustomers` trims: a trailing
 * space is not a different question.
 */
function normaliseFilters(filters: CustomerFilters): CustomerFilters {
  return {
    plans: CUSTOMER_PLANS.filter((plan) => filters.plans.includes(plan)),
    search: filters.search.trim(),
  }
}

function parseFilters(value: unknown): CustomerFilters | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  const candidate = value as Record<string, unknown>
  const { plans, search } = candidate

  if (typeof search !== 'string' || !Array.isArray(plans)) {
    return null
  }

  const entries: unknown[] = plans

  // A view naming a tier that has since been removed is dropped rather than
  // quietly narrowed to the tiers that are left: it would come back as a
  // different question under the same name.
  if (!entries.every(isCustomerPlan)) {
    return null
  }

  return normaliseFilters({ plans: entries, search })
}

function isCustomerPlan(value: unknown): value is CustomerPlan {
  return typeof value === 'string' && CUSTOMER_PLANS.some((plan) => plan === value)
}
