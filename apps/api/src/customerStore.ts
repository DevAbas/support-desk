import type {
  Customer,
  CustomerSummary,
  CustomerTicketRef,
  ListCustomersQuery,
  ListCustomersResponse,
  Ticket,
} from '@harness-sample/shared'
import { createSeedCustomers, type CustomerRecord } from './customerSeed'
import type { TicketStore } from './store'

/**
 * The in-memory customer store.
 *
 * It is read-only, and has no `reset`. Nothing in this app edits a customer, so
 * there is no state here to restore between tests — what a customer's ticket
 * count and ticket list say is read through the ticket store on every request
 * rather than copied at seed time, so resetting the queue is enough to reset
 * everything a customer screen can show.
 *
 * That live read is also why the store is handed the ticket store rather than a
 * snapshot: a customer holds ticket *ids*, and a ticket deleted through the
 * ticket routes should leave the customer who raised it immediately, not at the
 * next reload.
 *
 * Everything that leaves the store is built fresh, so a caller holds a response
 * rather than a handle on a row.
 */

export interface CustomerStore {
  list: (query: ListCustomersQuery) => ListCustomersResponse
  get: (id: string) => Customer | undefined
}

/** The two fields the order below is built from, and all a cursor encodes. */
interface CursorPosition {
  signupDate: string
  id: string
}

/**
 * Newest signup first, with the id breaking a tie.
 *
 * The order has to be total, not merely sorted: a cursor names a position in it,
 * and two rows sharing a position would be a page boundary that could repeat one
 * of them or skip it. Ids are unique, so adding one makes the order total.
 */
function byCursorOrder(a: CursorPosition, b: CursorPosition): number {
  if (a.signupDate !== b.signupDate) {
    return a.signupDate < b.signupDate ? 1 : -1
  }

  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

function toCursor(record: CursorPosition): string {
  return `${record.signupDate}|${record.id}`
}

/**
 * Whether a row falls after a cursor in the order above.
 *
 * The cursor is compared as the position it encodes rather than looked up as a
 * row, so a cursor whose row has since been filtered out — or would sort
 * differently now — still points at the same place in the list.
 */
function isAfterCursor(record: CustomerRecord, cursor: string): boolean {
  const separator = cursor.indexOf('|')
  const position: CursorPosition = {
    signupDate: cursor.slice(0, separator),
    id: cursor.slice(separator + 1),
  }

  return byCursorOrder(position, record) < 0
}

/** Name, company and email: the three things written on a row. */
function matchesSearch(record: CustomerRecord, search: string): boolean {
  if (search === '') {
    return true
  }

  return (
    record.name.toLowerCase().includes(search) ||
    record.company.toLowerCase().includes(search) ||
    record.email.toLowerCase().includes(search)
  )
}

function toTicketRef(ticket: Ticket): CustomerTicketRef {
  return {
    id: ticket.id,
    title: ticket.title,
    status: ticket.status,
    priority: ticket.priority,
    createdAt: ticket.createdAt,
  }
}

function byNewestFirst(a: CustomerTicketRef, b: CustomerTicketRef): number {
  return Date.parse(b.createdAt) - Date.parse(a.createdAt)
}

export function createCustomerStore(tickets: TicketStore): CustomerStore {
  const customers = createSeedCustomers().sort(byCursorOrder)

  /**
   * The queue as a lookup, built once per request rather than once per row: a
   * page of twenty customers would otherwise scan the whole queue twenty times
   * to count what it already holds the ids of.
   */
  function ticketsById(): Map<string, Ticket> {
    return new Map(tickets.snapshot().map((ticket) => [ticket.id, ticket]))
  }

  function ownedTickets(record: CustomerRecord, queue: Map<string, Ticket>): CustomerTicketRef[] {
    return record.ticketIds
      .map((id) => queue.get(id))
      .filter((ticket) => ticket !== undefined)
      .map(toTicketRef)
      .sort(byNewestFirst)
  }

  function toSummary(record: CustomerRecord, queue: Map<string, Ticket>): CustomerSummary {
    const { ticketIds, ...rest } = record

    return { ...rest, ticketCount: ticketIds.filter((id) => queue.has(id)).length }
  }

  return {
    list({ plans, search, cursor, limit }) {
      const query = search.trim().toLowerCase()

      const matches = customers
        .filter((record) => (plans.length === 0 ? true : plans.includes(record.plan)))
        .filter((record) => matchesSearch(record, query))

      // The cursor is applied after the filters, not before: it names a place in
      // the list the filters produce, so changing a filter mid-scroll starts a
      // new list rather than resuming someone else's.
      const remaining = cursor === undefined
        ? matches
        : matches.filter((record) => isAfterCursor(record, cursor))

      const rows = remaining.slice(0, limit)
      const last = rows.at(-1)
      const queue = ticketsById()

      return {
        rows: rows.map((record) => toSummary(record, queue)),
        // Null rather than the last row's cursor when this page emptied the
        // list, so the client is told there is no next page instead of asking
        // for one and being handed nothing.
        nextCursor: last && remaining.length > rows.length ? toCursor(last) : null,
        total: matches.length,
      }
    },

    get(id) {
      const record = customers.find((customer) => customer.id === id)

      if (!record) {
        return undefined
      }

      const queue = ticketsById()

      return { ...toSummary(record, queue), tickets: ownedTickets(record, queue) }
    },
  }
}
