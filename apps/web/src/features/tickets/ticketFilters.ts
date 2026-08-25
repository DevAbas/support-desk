import type { ListTicketsQuery, TicketPriority, TicketStatus } from '@harness-sample/shared'

/**
 * The filter combination the ticket list is showing.
 *
 * `all` means "do not filter on this", and is the one value here that is not a
 * status or a priority — which is why an admin cannot create one called `all`.
 * A saved view is a name attached to one of these — see `savedViews.ts`.
 *
 * Which values are valid is configuration rather than a union, so the options
 * these fill are built from the taxonomy at render time; see
 * `features/taxonomy/taxonomyOptions.ts`.
 */

export type StatusFilter = TicketStatus | 'all'

export type PriorityFilter = TicketPriority | 'all'

export interface TicketFilters {
  status: StatusFilter
  priority: PriorityFilter
  search: string
}

export const DEFAULT_FILTERS: TicketFilters = {
  status: 'all',
  priority: 'all',
  search: '',
}

/**
 * Whether two filter combinations would produce the same list.
 *
 * The search term is compared trimmed because `listTickets` trims it too: a
 * trailing space changes nothing on screen, so it must not make a saved view
 * look modified.
 */
export function areFiltersEqual(a: TicketFilters, b: TicketFilters): boolean {
  return (
    a.status === b.status && a.priority === b.priority && a.search.trim() === b.search.trim()
  )
}

/**
 * The filters as the list endpoint wants them.
 *
 * Every field is named, so a filter added to the contract is a compile error
 * here rather than a filter the query — and the cache key built from it —
 * quietly ignores. The search term is trimmed for the same reason
 * `areFiltersEqual` trims it: trailing space is not a different question, and it
 * should not become a different cache entry or a new request.
 */
export function toListTicketsQuery(
  filters: TicketFilters,
  page: number,
  pageSize: number,
): ListTicketsQuery {
  return {
    status: filters.status,
    priority: filters.priority,
    search: filters.search.trim(),
    page,
    pageSize,
  }
}
