import type { ListCustomersFilters } from '@support-desk/shared'

/**
 * Every cache key the customer screens use.
 *
 * The same rule as `ticketKeys` and `reportKeys`: keys are never written as
 * inline arrays at a call site, so a typo cannot quietly split the cache or fail
 * to invalidate.
 *
 * `list` takes the filters *without* the cursor, and that omission is the point.
 * The pages of an infinite list are all answers to one question, held under one
 * key; folding the cursor in would file every page under a question of its own,
 * and the list would forget everything already loaded the moment it asked for
 * more.
 */

const all = ['customers'] as const

const lists = [...all, 'list'] as const

const details = [...all, 'detail'] as const

export const customerKeys = {
  all: () => all,
  lists: () => lists,
  list: (filters: ListCustomersFilters) => [...lists, filters] as const,
  details: () => details,
  detail: (id: string) => [...details, id] as const,
}
