import {
  cloneTaxonomy,
  DEFAULT_TAXONOMY,
  taxonomyValues,
  type AddCommentBody,
  type CreateTicketBody,
  type ListTicketsQuery,
  type ListTicketsResponse,
  type Taxonomy,
  type TaxonomyReassign,
  type TaxonomyUsage,
  type Ticket,
  type TicketStatus,
  type UpdateTicketBody,
} from '@harness-sample/shared'
import { createSeedTickets } from './seed'

/**
 * The in-memory ticket store.
 *
 * It is deliberately not role-aware: it will delete a ticket for anyone who
 * asks. There is no authentication in this app, so authorisation lives in the
 * UI.
 *
 * Everything that leaves the store is cloned. Callers hold the response, not a
 * handle on the row, so a mutation cannot reach back through one.
 */

/**
 * Replacing the taxonomy either succeeds, moving some number of tickets onto
 * different values, or fails with everything wrong with the request — the rules
 * live here rather than in the route because only the store knows what the
 * tickets are actually holding.
 */
export type SetTaxonomyResult =
  | { ok: true; migrated: number }
  | { ok: false; issues: string[] }

export interface TicketStore {
  list: (query: ListTicketsQuery) => ListTicketsResponse
  get: (id: string) => Ticket | undefined
  create: (input: CreateTicketBody) => Ticket
  update: (id: string, patch: UpdateTicketBody) => Ticket | undefined
  addComment: (id: string, input: AddCommentBody) => Ticket | undefined
  remove: (id: string) => boolean
  bulkUpdateStatus: (ids: readonly string[], status: TicketStatus) => number
  bulkRemove: (ids: readonly string[]) => number
  getTaxonomy: () => Taxonomy
  /** How many tickets hold each value. Values nothing holds are absent, not zero. */
  getTaxonomyUsage: () => TaxonomyUsage
  setTaxonomy: (next: Taxonomy, reassign: TaxonomyReassign) => SetTaxonomyResult
  /** Restores the seed state. Tests call this between cases. */
  reset: () => void
}

function cloneTicket(ticket: Ticket): Ticket {
  return { ...ticket, comments: ticket.comments.map((comment) => ({ ...comment })) }
}

function byNewestFirst(a: Ticket, b: Ticket): number {
  return Date.parse(b.createdAt) - Date.parse(a.createdAt)
}

function formatTicketId(sequence: number): string {
  return `TCK-${String(sequence).padStart(4, '0')}`
}

function countBy(values: readonly string[]): Record<string, number> {
  const counts: Record<string, number> = {}

  for (const value of values) {
    counts[value] = (counts[value] ?? 0) + 1
  }

  return counts
}

export function createTicketStore(): TicketStore {
  let tickets: Ticket[] = createSeedTickets()
  let nextSequence = tickets.length + 1
  let taxonomy: Taxonomy = cloneTaxonomy(DEFAULT_TAXONOMY)

  function find(id: string): Ticket | undefined {
    return tickets.find((ticket) => ticket.id === id)
  }

  /**
   * Which values tickets hold that the incoming set does not have, and where
   * each of them is being sent.
   *
   * Read off the tickets rather than off the current taxonomy: what has to be
   * migrated is what is actually in use, which is the only thing that can be
   * left stranded.
   */
  function planMigration(
    held: readonly string[],
    nextValues: readonly string[],
    reassign: Readonly<Record<string, string>>,
    subject: string,
  ): { moves: Record<string, string>; issues: string[] } {
    const allowed = new Set(nextValues)
    const moves: Record<string, string> = {}
    const issues: string[] = []

    for (const value of new Set(held)) {
      if (allowed.has(value)) {
        continue
      }

      const target = reassign[value]

      if (target === undefined) {
        issues.push(
          `${subject}: tickets still use "${value}", so removing it needs a ${subject} to move them to.`,
        )
        continue
      }

      if (!allowed.has(target)) {
        issues.push(`${subject}: "${target}" is not one of ${nextValues.join(', ')}.`)
        continue
      }

      moves[value] = target
    }

    return { moves, issues }
  }

  return {
    list({ status, priority, search, page, pageSize }) {
      const query = search.trim().toLowerCase()

      const matches = tickets
        .filter((ticket) => (status === 'all' ? true : ticket.status === status))
        .filter((ticket) => (priority === 'all' ? true : ticket.priority === priority))
        .filter((ticket) =>
          query === ''
            ? true
            : ticket.title.toLowerCase().includes(query) ||
              ticket.id.toLowerCase().includes(query),
        )
        .sort(byNewestFirst)

      const pageCount = Math.max(1, Math.ceil(matches.length / pageSize))
      // Asking for a page past the end lands on the last one rather than on an
      // empty list, so deleting the tail of the queue cannot strand the table.
      const safePage = Math.min(page, pageCount)
      const start = (safePage - 1) * pageSize

      return {
        rows: matches.slice(start, start + pageSize).map(cloneTicket),
        total: matches.length,
        page: safePage,
        pageCount,
      }
    },

    get(id) {
      const ticket = find(id)
      return ticket ? cloneTicket(ticket) : undefined
    },

    create(input) {
      const ticket: Ticket = {
        id: formatTicketId(nextSequence),
        title: input.title,
        description: input.description,
        // The first status is the one the queue starts in; an admin reorders
        // the set on the Settings page, so this is not a fixed 'open'.
        status: taxonomy.statuses[0]?.value ?? DEFAULT_TAXONOMY.statuses[0].value,
        priority: input.priority,
        assignee: input.assignee,
        createdAt: new Date().toISOString(),
        comments: [],
      }

      nextSequence += 1
      tickets = [ticket, ...tickets]

      return cloneTicket(ticket)
    },

    update(id, patch) {
      const ticket = find(id)

      if (!ticket) {
        return undefined
      }

      // Written field by field: spreading the patch would copy the `undefined`
      // that an absent field parses to over a value that is already set.
      if (patch.status !== undefined) {
        ticket.status = patch.status
      }

      if (patch.priority !== undefined) {
        ticket.priority = patch.priority
      }

      if (patch.assignee !== undefined) {
        ticket.assignee = patch.assignee
      }

      return cloneTicket(ticket)
    },

    addComment(id, input) {
      const ticket = find(id)

      if (!ticket) {
        return undefined
      }

      ticket.comments = [
        ...ticket.comments,
        {
          id: `c-${ticket.id}-${ticket.comments.length + 1}`,
          author: input.author,
          body: input.body,
          createdAt: new Date().toISOString(),
        },
      ]

      return cloneTicket(ticket)
    },

    remove(id) {
      const before = tickets.length
      tickets = tickets.filter((ticket) => ticket.id !== id)

      return tickets.length < before
    },

    bulkUpdateStatus(ids, status) {
      const targets = new Set(ids)
      let updated = 0

      for (const ticket of tickets) {
        if (targets.has(ticket.id)) {
          ticket.status = status
          updated += 1
        }
      }

      return updated
    },

    bulkRemove(ids) {
      const targets = new Set(ids)
      const before = tickets.length
      tickets = tickets.filter((ticket) => !targets.has(ticket.id))

      return before - tickets.length
    },

    getTaxonomy() {
      return cloneTaxonomy(taxonomy)
    },

    getTaxonomyUsage() {
      return {
        statuses: countBy(tickets.map((ticket) => ticket.status)),
        priorities: countBy(tickets.map((ticket) => ticket.priority)),
      }
    },

    setTaxonomy(next, reassign) {
      const statusPlan = planMigration(
        tickets.map((ticket) => ticket.status),
        taxonomyValues(next.statuses),
        reassign.statuses,
        'status',
      )
      const priorityPlan = planMigration(
        tickets.map((ticket) => ticket.priority),
        taxonomyValues(next.priorities),
        reassign.priorities,
        'priority',
      )

      const issues = [...statusPlan.issues, ...priorityPlan.issues]

      // Nothing is written unless the whole edit is valid, so a rejected request
      // leaves the taxonomy and every ticket exactly as they were.
      if (issues.length > 0) {
        return { ok: false, issues }
      }

      let migrated = 0

      for (const ticket of tickets) {
        const nextStatus = statusPlan.moves[ticket.status]
        const nextPriority = priorityPlan.moves[ticket.priority]

        if (nextStatus === undefined && nextPriority === undefined) {
          continue
        }

        ticket.status = nextStatus ?? ticket.status
        ticket.priority = nextPriority ?? ticket.priority
        migrated += 1
      }

      taxonomy = cloneTaxonomy(next)

      return { ok: true, migrated }
    },

    reset() {
      tickets = createSeedTickets()
      nextSequence = tickets.length + 1
      taxonomy = cloneTaxonomy(DEFAULT_TAXONOMY)
    },
  }
}
