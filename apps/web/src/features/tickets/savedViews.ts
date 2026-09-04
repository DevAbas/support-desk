import { TICKET_PRIORITIES, TICKET_STATUSES } from '@support-desk/shared'
import type { SavedViewScope } from '@/features/savedViews/savedViews.types'
import {
  DEFAULT_FILTERS,
  type PriorityFilter,
  type StatusFilter,
  type TicketFilters,
} from './ticketFilters'

/**
 * The ticket queue's saved views: this screen's filters, described to the shared
 * mechanism in `features/savedViews`.
 *
 * The whole of what is per-screen is below. The storage, the sidebar, the naming
 * dialog, which view is selected and whether the filters have drifted from it
 * are all one mechanism now, shared with the customer list — see
 * `features/savedViews/savedViews.types.ts` for what a scope is and why the two
 * screens' filters stay different shapes.
 */

/**
 * Exported so tests can seed and inspect what the screen actually reads.
 *
 * Not `….tickets`, which is the shape a second screen's key takes, because this
 * one predates there being a second screen and every view already saved is
 * under it. A key is not worth a migration to make symmetrical.
 */
export const SAVED_VIEWS_STORAGE_KEY = 'support-desk.saved-views'

export const TICKET_SAVED_VIEWS: SavedViewScope<TicketFilters> = {
  storageKey: SAVED_VIEWS_STORAGE_KEY,
  allLabel: 'All tickets',
  filtersDescription: 'The status, priority, and search on screen are stored under this name.',
  defaultFilters: DEFAULT_FILTERS,
  normaliseFilters,
  parseFilters,
}

/**
 * The search term is trimmed because `listTickets` trims it too: a trailing
 * space changes nothing on screen, so it must neither be stored nor make a saved
 * view look modified.
 */
function normaliseFilters(filters: TicketFilters): TicketFilters {
  return { ...filters, search: filters.search.trim() }
}

function parseFilters(value: unknown): TicketFilters | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  const candidate = value as Record<string, unknown>
  const { status, priority, search } = candidate

  if (!isStatusFilter(status) || !isPriorityFilter(priority) || typeof search !== 'string') {
    return null
  }

  return normaliseFilters({ status, priority, search })
}

function isStatusFilter(value: unknown): value is StatusFilter {
  return (
    typeof value === 'string' &&
    (value === 'all' || TICKET_STATUSES.some((status) => status === value))
  )
}

function isPriorityFilter(value: unknown): value is PriorityFilter {
  return (
    typeof value === 'string' &&
    (value === 'all' || TICKET_PRIORITIES.some((priority) => priority === value))
  )
}
