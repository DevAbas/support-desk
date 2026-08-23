import type {
  AddCommentBody,
  CreateTicketBody,
  ListTicketsQuery,
  ListTicketsResponse,
  Ticket,
  TicketStatus,
  UpdateTicketBody,
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

export interface TicketStore {
  list: (query: ListTicketsQuery) => ListTicketsResponse
  get: (id: string) => Ticket | undefined
  create: (input: CreateTicketBody) => Ticket
  update: (id: string, patch: UpdateTicketBody) => Ticket | undefined
  addComment: (id: string, input: AddCommentBody) => Ticket | undefined
  remove: (id: string) => boolean
  bulkUpdateStatus: (ids: readonly string[], status: TicketStatus) => number
  bulkRemove: (ids: readonly string[]) => number
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

export function createTicketStore(): TicketStore {
  let tickets: Ticket[] = createSeedTickets()
  let nextSequence = tickets.length + 1

  function find(id: string): Ticket | undefined {
    return tickets.find((ticket) => ticket.id === id)
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
        status: 'open',
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

    reset() {
      tickets = createSeedTickets()
      nextSequence = tickets.length + 1
    },
  }
}
