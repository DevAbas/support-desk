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
 * It is not role-aware and does not need to be: the routes in `app.ts` decide
 * who may call `remove` and `bulkRemove` before either is reached. A store that
 * also checked would be a second place to keep that decision correct.
 *
 * Everything that leaves the store is cloned. Callers hold the response, not a
 * handle on the row, so a mutation cannot reach back through one.
 */

/** A page of matches, and how many there were to page. */
export interface TicketSearchResult {
  rows: Ticket[]
  /** Everything that matched, not only what is being served. */
  total: number
}

export interface TicketStore {
  list: (query: ListTicketsQuery) => ListTicketsResponse
  /**
   * The whole queue at once, for the reporting endpoints. Aggregating over a
   * range is not a question a page of rows can answer, and the alternative —
   * asking `list` for a page large enough to hold everything — would make the
   * report silently wrong the day the queue outgrows `MAX_PAGE_SIZE`.
   */
  snapshot: () => Ticket[]
  /**
   * The queue as global search asks it: id, title or assignee, best match
   * first, capped.
   *
   * Deliberately not `list` with a `search`. That one is the filter above the
   * ticket table, and it reads a title and an id because those are the two
   * things somebody narrowing a table types. This one has to find the ticket
   * that was mentioned by who it is on as well, and widening `list` to do it
   * would silently change what the ticket screen's own filter means. Two
   * questions, two methods.
   */
  search: (query: string, limit: number) => TicketSearchResult
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

/**
 * Best match first, which for a ticket means the id somebody typed in full.
 *
 * `TCK-0007` is a request for exactly one ticket, and the substring match that
 * finds it also finds every id it is a prefix of; ranking is the difference
 * between answering the question and putting the answer third. Everything else
 * falls back to the queue's own order, because among partial matches recency is
 * the only thing this store honestly knows.
 */
function byBestMatch(term: string): (a: Ticket, b: Ticket) => number {
  return (a, b) => {
    const exact = Number(b.id.toLowerCase() === term) - Number(a.id.toLowerCase() === term)

    return exact === 0 ? byNewestFirst(a, b) : exact
  }
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

    snapshot() {
      return tickets.map(cloneTicket)
    },

    search(query, limit) {
      const term = query.trim().toLowerCase()

      // An empty term matches every ticket by substring, which is the whole
      // queue offered as a search result. Nothing typed is nothing found.
      if (term === '') {
        return { rows: [], total: 0 }
      }

      const matches = tickets
        .filter(
          (ticket) =>
            ticket.id.toLowerCase().includes(term) ||
            ticket.title.toLowerCase().includes(term) ||
            ticket.assignee.toLowerCase().includes(term),
        )
        .sort(byBestMatch(term))

      return { rows: matches.slice(0, limit).map(cloneTicket), total: matches.length }
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
