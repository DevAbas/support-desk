import type { SelectOption } from '@support-desk/ui'
import {
  TICKET_PRIORITIES,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUSES,
  TICKET_STATUS_LABELS,
  type ListTicketsQuery,
  type TicketPriority,
  type TicketStatus,
} from '@support-desk/shared'

/**
 * The filter combination the ticket list is showing.
 *
 * `all` is a UI-only widening of the domain unions: it means "do not filter on
 * this". A saved view is a name attached to one of these — see `savedViews.ts`.
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

export const statusFilterOptions: readonly SelectOption<StatusFilter>[] = [
  { value: 'all', label: 'All statuses' },
  ...TICKET_STATUSES.map((status) => ({ value: status, label: TICKET_STATUS_LABELS[status] })),
]

export const priorityFilterOptions: readonly SelectOption<PriorityFilter>[] = [
  { value: 'all', label: 'All priorities' },
  ...TICKET_PRIORITIES.map((priority) => ({
    value: priority,
    label: TICKET_PRIORITY_LABELS[priority],
  })),
]

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
