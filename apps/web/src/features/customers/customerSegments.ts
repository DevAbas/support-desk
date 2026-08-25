import { CUSTOMER_PLANS, type CustomerPlan } from '@harness-sample/shared'
import { normalizePlans, type CustomerFilters } from './customerFilters'

/**
 * Saved segments: a named slice of the customer base, kept in localStorage.
 *
 * The same reasoning as the ticket screen's saved views — a shortcut a person
 * keeps for themselves is not the server's to hold, and not query cache either —
 * over a different filter shape, under a key of its own. The two are deliberately
 * not one module: a view stores single-value unions widened with `'all'`, a
 * segment stores a set of plans, and the thing that would have made them one is
 * a generic that no longer validates either.
 */

export interface CustomerSegment {
  id: string
  name: string
  filters: CustomerFilters
}

/** Exported so tests can seed and inspect what the screen actually reads. */
export const CUSTOMER_SEGMENTS_STORAGE_KEY = 'support-desk.customer-segments'

function isCustomerPlan(value: unknown): value is CustomerPlan {
  return typeof value === 'string' && CUSTOMER_PLANS.some((plan) => plan === value)
}

function isCustomerFilters(value: unknown): value is CustomerFilters {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    Array.isArray(candidate.plans) &&
    candidate.plans.every(isCustomerPlan) &&
    typeof candidate.search === 'string'
  )
}

function isCustomerSegment(value: unknown): value is CustomerSegment {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    isCustomerFilters(candidate.filters)
  )
}

/**
 * Stored in the shape the screen applies: plans in domain order, search trimmed.
 *
 * Written on the way in *and* on the way out, because storage is shared with
 * older builds and with whatever else has written to this origin. A segment
 * holding the same plans in a different order is the same question, and it must
 * not reach the list as a second one.
 */
function normalizeSegment(segment: CustomerSegment): CustomerSegment {
  return {
    ...segment,
    filters: {
      plans: normalizePlans(segment.filters.plans),
      search: segment.filters.search.trim(),
    },
  }
}

/**
 * Reads the stored segments, dropping anything that no longer parses.
 *
 * Nothing that comes back is trusted: a malformed entry — or a plan that has
 * since been removed from the domain — is skipped rather than allowed to break
 * the screen or to filter on a plan the server has never heard of.
 */
export function readSavedSegments(): CustomerSegment[] {
  try {
    const raw = window.localStorage.getItem(CUSTOMER_SEGMENTS_STORAGE_KEY)

    if (!raw) {
      return []
    }

    const parsed: unknown = JSON.parse(raw)

    return Array.isArray(parsed) ? parsed.filter(isCustomerSegment).map(normalizeSegment) : []
  } catch {
    // Unavailable or unparseable storage means no saved segments, not a crash.
    return []
  }
}

export function writeSavedSegments(segments: readonly CustomerSegment[]): void {
  try {
    window.localStorage.setItem(CUSTOMER_SEGMENTS_STORAGE_KEY, JSON.stringify(segments))
  } catch {
    // Private-mode and quota failures lose the segment, but not the session.
  }
}

/** `crypto.randomUUID` needs a secure context, which a LAN dev server is not. */
function createId(): string {
  return `segment-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function createSavedSegment(name: string, filters: CustomerFilters): CustomerSegment {
  return normalizeSegment({ id: createId(), name: name.trim(), filters })
}
