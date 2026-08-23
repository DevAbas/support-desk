import { TICKET_PRIORITIES, TICKET_STATUSES } from '../../lib/types'
import type { PriorityFilter, StatusFilter, TicketFilters } from './ticketFilters'

/**
 * Saved views: a named filter combination, kept in localStorage.
 *
 * These never reach the API, and they are not in the query cache either — a view
 * is a shortcut the person using the screen keeps for themselves, so it lives in
 * the browser rather than on the server.
 */

export interface SavedView {
  id: string
  name: string
  filters: TicketFilters
}

/** Exported so tests can seed and inspect what the screen actually reads. */
export const SAVED_VIEWS_STORAGE_KEY = 'support-desk.saved-views'

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

function isTicketFilters(value: unknown): value is TicketFilters {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    isStatusFilter(candidate.status) &&
    isPriorityFilter(candidate.priority) &&
    typeof candidate.search === 'string'
  )
}

function isSavedView(value: unknown): value is SavedView {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    isTicketFilters(candidate.filters)
  )
}

/**
 * Reads the stored views, dropping anything that no longer parses.
 *
 * Storage is shared with older builds of the app and with whatever else has
 * written to this origin, so nothing that comes back is trusted: a malformed
 * entry — or a status that has since been removed from the domain — is skipped
 * rather than allowed to break the screen.
 */
export function readSavedViews(): SavedView[] {
  try {
    const raw = window.localStorage.getItem(SAVED_VIEWS_STORAGE_KEY)

    if (!raw) {
      return []
    }

    const parsed: unknown = JSON.parse(raw)

    return Array.isArray(parsed) ? parsed.filter(isSavedView) : []
  } catch {
    // Unavailable or unparseable storage means no saved views, not a crash.
    return []
  }
}

export function writeSavedViews(views: readonly SavedView[]): void {
  try {
    window.localStorage.setItem(SAVED_VIEWS_STORAGE_KEY, JSON.stringify(views))
  } catch {
    // Private-mode and quota failures lose the view, but not the session.
  }
}

/** `crypto.randomUUID` needs a secure context, which a LAN dev server is not. */
function createId(): string {
  return `view-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function createSavedView(name: string, filters: TicketFilters): SavedView {
  return {
    id: createId(),
    name: name.trim(),
    // Stored trimmed so that reapplying the view puts a clean value in the field.
    filters: { ...filters, search: filters.search.trim() },
  }
}
