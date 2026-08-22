import { createSeedTickets } from './seed'
import type { Ticket, TicketPriority, TicketStatus } from './types'

/**
 * A mock data layer standing in for a real backend.
 *
 * Every call is asynchronous and artificially slow, so the loading states in the
 * UI are real states that have to be handled rather than decoration. The store is
 * a module-level array: mutations persist while the tab is open and are lost on
 * reload.
 *
 * This layer is deliberately not role-aware. It will happily delete a ticket for
 * anyone who asks. Authorisation lives in the UI.
 */

let tickets: Ticket[] = createSeedTickets()
let nextTicketNumber = tickets.length + 1

/** Tests would be needlessly slow, and flaky, if they waited on real latency. */
const LATENCY_RANGE_MS: readonly [number, number] =
  import.meta.env.MODE === 'test' ? [0, 0] : [250, 600]

function delay(): Promise<void> {
  const [min, max] = LATENCY_RANGE_MS
  const duration = min + Math.random() * (max - min)
  return new Promise((resolve) => setTimeout(resolve, duration))
}

function cloneTicket(ticket: Ticket): Ticket {
  return { ...ticket, comments: ticket.comments.map((comment) => ({ ...comment })) }
}

function findTicket(id: string): Ticket {
  const ticket = tickets.find((candidate) => candidate.id === id)

  if (!ticket) {
    throw new Error(`Ticket ${id} was not found.`)
  }

  return ticket
}

function byNewestFirst(a: Ticket, b: Ticket): number {
  return Date.parse(b.createdAt) - Date.parse(a.createdAt)
}

/** Resets the store to its seed state. Used by tests. */
export function resetTickets(): void {
  tickets = createSeedTickets()
  nextTicketNumber = tickets.length + 1
}

export interface ListTicketsParams {
  page?: number
  pageSize?: number
  status?: TicketStatus | 'all'
  priority?: TicketPriority | 'all'
  search?: string
}

export interface ListTicketsResult {
  rows: Ticket[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

export async function listTickets({
  page = 1,
  pageSize = 10,
  status = 'all',
  priority = 'all',
  search = '',
}: ListTicketsParams = {}): Promise<ListTicketsResult> {
  await delay()

  const query = search.trim().toLowerCase()

  const matches = tickets
    .filter((ticket) => (status === 'all' ? true : ticket.status === status))
    .filter((ticket) => (priority === 'all' ? true : ticket.priority === priority))
    .filter((ticket) =>
      query === ''
        ? true
        : ticket.title.toLowerCase().includes(query) || ticket.id.toLowerCase().includes(query),
    )
    .sort(byNewestFirst)

  const pageCount = Math.max(1, Math.ceil(matches.length / pageSize))
  const safePage = Math.min(Math.max(1, page), pageCount)
  const start = (safePage - 1) * pageSize

  return {
    rows: matches.slice(start, start + pageSize).map(cloneTicket),
    total: matches.length,
    page: safePage,
    pageSize,
    pageCount,
  }
}

export async function getTicket(id: string): Promise<Ticket> {
  await delay()
  return cloneTicket(findTicket(id))
}

export interface CreateTicketInput {
  title: string
  description: string
  priority: TicketPriority
  assignee: string
}

export async function createTicket(input: CreateTicketInput): Promise<Ticket> {
  await delay()

  const ticket: Ticket = {
    id: `TCK-${String(nextTicketNumber).padStart(4, '0')}`,
    title: input.title,
    description: input.description,
    status: 'open',
    priority: input.priority,
    assignee: input.assignee,
    createdAt: new Date().toISOString(),
    comments: [],
  }

  nextTicketNumber += 1
  tickets = [ticket, ...tickets]

  return cloneTicket(ticket)
}

export async function updateTicketStatus(id: string, status: TicketStatus): Promise<Ticket> {
  await delay()

  const ticket = findTicket(id)
  ticket.status = status

  return cloneTicket(ticket)
}

export interface AddCommentInput {
  author: string
  body: string
}

export async function addComment(id: string, input: AddCommentInput): Promise<Ticket> {
  await delay()

  const ticket = findTicket(id)

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
}

export async function deleteTicket(id: string): Promise<void> {
  await delay()

  findTicket(id)
  tickets = tickets.filter((ticket) => ticket.id !== id)
}

/** Returns how many tickets were changed. */
export async function bulkUpdateStatus(
  ids: readonly string[],
  status: TicketStatus,
): Promise<number> {
  await delay()

  const targets = new Set(ids)
  let changed = 0

  for (const ticket of tickets) {
    if (targets.has(ticket.id)) {
      ticket.status = status
      changed += 1
    }
  }

  return changed
}

/** Returns how many tickets were removed. */
export async function bulkDeleteTickets(ids: readonly string[]): Promise<number> {
  await delay()

  const targets = new Set(ids)
  const before = tickets.length
  tickets = tickets.filter((ticket) => !targets.has(ticket.id))

  return before - tickets.length
}

export async function listAssignees(): Promise<string[]> {
  await delay()
  return [...new Set(tickets.map((ticket) => ticket.assignee))].sort()
}
