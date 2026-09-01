import type { Hono } from 'hono'
import {
  canReachNavigationTarget,
  navigationTargetsFor,
  SEARCH_RESULT_TYPES,
  searchQuerySchema,
  type CustomerSummary,
  type NavigationTarget,
  type NavigationTargetId,
  type Role,
  type SearchGroup,
  type SearchQuery,
  type SearchResponse,
  type SearchResult,
  type SearchResultType,
  type Ticket,
} from '@support-desk/shared'
import type { CustomerStore } from './customerStore'
import { currentUser, invalid, type AppEnv } from './respond'
import type { TicketStore } from './store'

/**
 * Global search: one question asked of everything the app knows about.
 *
 * It lives beside `reports.ts` rather than inside `app.ts`, and for the same two
 * reasons. `createApiApp` is one function against a 185-line ceiling it is
 * already close to, and this is a read that spans both stores rather than a
 * route over one of them — the aggregation belongs next to the other aggregation
 * and not in the file that wires routes together.
 *
 * **What the client does not do.** It does not fetch the queue and filter it, it
 * does not ask two endpoints and interleave them, and it does not decide which
 * of what came back an agent is allowed to see. All three are here.
 */

export interface SearchStores {
  store: TicketStore
  customers: CustomerStore
}

/**
 * The screen a group's results live on.
 *
 * This is what makes "whatever an agent cannot reach through the nav must not
 * appear in their search" structural rather than remembered: a group is searched
 * only if its screen is reachable, so gating a screen in `NAVIGATION_TARGETS`
 * takes its records out of that role's search without this file being edited.
 * The navigation group is `null` because it is not one screen — every
 * destination in it carries its own reachability.
 *
 * Keyed by the union, so a result type added without an answer to that question
 * is a compile error rather than a group that quietly ignores the rule.
 */
const SCREEN_BY_RESULT_TYPE: Record<SearchResultType, NavigationTargetId | null> = {
  ticket: 'tickets',
  customer: 'customers',
  navigation: null,
}

function isReachable(type: SearchResultType, role: Role): boolean {
  const screen = SCREEN_BY_RESULT_TYPE[type]

  return screen === null || canReachNavigationTarget(role, screen)
}

function toTicketResult(ticket: Ticket): SearchResult {
  return {
    type: 'ticket',
    id: ticket.id,
    title: ticket.title,
    assignee: ticket.assignee,
    status: ticket.status,
    priority: ticket.priority,
  }
}

function toCustomerResult(customer: CustomerSummary): SearchResult {
  return {
    type: 'customer',
    id: customer.id,
    name: customer.name,
    company: customer.company,
    email: customer.email,
    avatarUrl: customer.avatarUrl,
    plan: customer.plan,
  }
}

function toNavigationResult(target: NavigationTarget): SearchResult {
  return {
    type: 'navigation',
    id: target.id,
    label: target.label,
    description: target.description,
    path: target.path,
  }
}

/**
 * A screen matches on everything written about it: what it is called, what it is
 * for, and the words somebody would look for it by. "inbox" has to find the
 * queue, and the queue is not called that anywhere on screen.
 */
function matchesTarget(target: NavigationTarget, term: string): boolean {
  return [target.label, target.description, ...target.keywords].some((text) =>
    text.toLowerCase().includes(term),
  )
}

function navigationGroup(term: string, limit: number, role: Role): SearchGroup {
  const matches = navigationTargetsFor(role).filter((target) => matchesTarget(target, term))

  return {
    type: 'navigation',
    total: matches.length,
    results: matches.slice(0, limit).map(toNavigationResult),
  }
}

function ticketGroup(store: TicketStore, term: string, limit: number): SearchGroup {
  const { rows, total } = store.search(term, limit)

  return { type: 'ticket', total, results: rows.map(toTicketResult) }
}

/**
 * The customer list answers this one as it stands.
 *
 * Its search already reads the three things written on a customer row — name,
 * company and email — which is exactly what a person looking for a customer
 * types, so a second matcher here would be a second place for that rule to be
 * true. The queue needed its own because the ticket list's search does not read
 * an assignee; this one needed nothing.
 */
function customerGroup(customers: CustomerStore, term: string, limit: number): SearchGroup {
  const { rows, total } = customers.list({ plans: [], search: term, limit })

  return { type: 'customer', total, results: rows.map(toCustomerResult) }
}

export function buildSearch(
  stores: SearchStores,
  query: SearchQuery,
  role: Role,
): SearchResponse {
  const term = query.q.trim().toLowerCase()

  if (term === '') {
    return { groups: [] }
  }

  // Keyed by the union and walked in its order, so the group order is the one
  // decision made in `SEARCH_RESULT_TYPES` rather than a second one here.
  const builders: Record<SearchResultType, () => SearchGroup> = {
    ticket: () => ticketGroup(stores.store, term, query.limit),
    customer: () => customerGroup(stores.customers, term, query.limit),
    navigation: () => navigationGroup(term, query.limit, role),
  }

  const groups = SEARCH_RESULT_TYPES.filter((type) => isReachable(type, role))
    .map((type) => builders[type]())
    .filter((group) => group.results.length > 0)

  return { groups }
}

/**
 * Registered here rather than in `app.ts` for the reason at the top of this
 * file. It is one route, and it is a `GET` behind the same session middleware as
 * everything else — the role it answers for is the session's, never a parameter,
 * so there is nothing a caller can say to be served somebody else's search.
 */
export function registerSearchRoute(app: Hono<AppEnv>, stores: SearchStores): void {
  app.get('/api/search', (c) => {
    const query = searchQuerySchema.safeParse(c.req.query())

    if (!query.success) {
      return invalid(c, query.error, 'query string')
    }

    return c.json(buildSearch(stores, query.data, currentUser(c).role))
  })
}
