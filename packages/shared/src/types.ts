/** The shared domain vocabulary. The API contract and the feature screens both speak it. */

export const ROLES = ['agent', 'admin'] as const

export type Role = (typeof ROLES)[number]

/**
 * A ticket's status and priority are configuration, not a compile-time union.
 * An admin edits both on the Settings page, so the only thing known statically
 * is that a value is a slug — which of them exist is whatever the taxonomy in
 * the store currently says.
 *
 * The aliases stay because a signature reading `status: TicketStatus` still says
 * more than `status: string`, even though the checking they used to give is now
 * done at runtime: the contract validates the *shape* of a value, and the server
 * validates its *membership* against the live taxonomy.
 */
export type TicketStatus = string

export type TicketPriority = string

/**
 * How a taxonomy entry is meant to read on screen. These are presentation
 * intents in domain vocabulary — the design system's `BadgeStatus` happens to
 * use the same five words, and the feature layer maps one onto the other. That
 * mapping is written out in `features/taxonomy/appearance.ts` rather than
 * assumed, so the two can diverge without either silently going unstyled.
 */
export const TICKET_APPEARANCES = ['neutral', 'info', 'success', 'warning', 'danger'] as const

export type TicketAppearance = (typeof TICKET_APPEARANCES)[number]

/**
 * One configurable status or priority.
 *
 * `value` is what a ticket stores and what the API filters on; it is fixed once
 * created, because changing it would orphan every ticket holding it. `label` is
 * what a person reads and can be edited freely.
 */
export interface TaxonomyEntry {
  value: string
  label: string
  appearance: TicketAppearance
}

/**
 * The editable sets, in display order.
 *
 * Order is meaningful in two ways: it is the order the dropdowns offer, and the
 * first status is the one a newly created ticket opens in.
 */
export interface Taxonomy {
  statuses: TaxonomyEntry[]
  priorities: TaxonomyEntry[]
}

/** How many tickets currently hold each value, keyed by value. */
export interface TaxonomyUsage {
  statuses: Record<string, number>
  priorities: Record<string, number>
}

/** The lower and upper bounds on each set. One entry has to remain: a ticket cannot hold nothing. */
export const MIN_TAXONOMY_ENTRIES = 1

export const MAX_TAXONOMY_ENTRIES = 12

export const MAX_TAXONOMY_VALUE_LENGTH = 40

export const MAX_TAXONOMY_LABEL_LENGTH = 40

/** Lowercase, digits and single inner hyphens: a value ends up in a query string. */
export const TAXONOMY_VALUE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * `all` is what the list endpoint reads as "do not filter on this", so a status
 * called `all` would be a status nothing could filter to.
 */
export const RESERVED_TAXONOMY_VALUES = ['all'] as const

/** What the store starts with, and what `reset()` puts back. */
export const DEFAULT_TAXONOMY: Taxonomy = {
  statuses: [
    { value: 'open', label: 'Open', appearance: 'info' },
    { value: 'pending', label: 'Pending', appearance: 'warning' },
    { value: 'resolved', label: 'Resolved', appearance: 'success' },
    { value: 'closed', label: 'Closed', appearance: 'neutral' },
  ],
  priorities: [
    { value: 'low', label: 'Low', appearance: 'neutral' },
    { value: 'medium', label: 'Medium', appearance: 'info' },
    { value: 'high', label: 'High', appearance: 'danger' },
  ],
}

export function cloneTaxonomy(taxonomy: Taxonomy): Taxonomy {
  return {
    statuses: taxonomy.statuses.map((entry) => ({ ...entry })),
    priorities: taxonomy.priorities.map((entry) => ({ ...entry })),
  }
}

export function findTaxonomyEntry(
  entries: readonly TaxonomyEntry[],
  value: string,
): TaxonomyEntry | undefined {
  return entries.find((entry) => entry.value === value)
}

/**
 * The label for a value, falling back to the value itself.
 *
 * A ticket can be holding a value the taxonomy no longer has — the query cache
 * may be a moment behind an edit — and showing the raw `escalated` is better
 * than showing a blank cell.
 */
export function taxonomyLabel(entries: readonly TaxonomyEntry[], value: string): string {
  return findTaxonomyEntry(entries, value)?.label ?? value
}

export function taxonomyValues(entries: readonly TaxonomyEntry[]): string[] {
  return entries.map((entry) => entry.value)
}

export interface TicketComment {
  id: string
  author: string
  body: string
  /** ISO 8601 timestamp. */
  createdAt: string
}

export interface Ticket {
  id: string
  title: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  assignee: string
  /** ISO 8601 timestamp. */
  createdAt: string
  comments: TicketComment[]
}
