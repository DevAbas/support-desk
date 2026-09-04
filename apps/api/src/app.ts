import { Hono } from 'hono'
import {
  addCommentBodySchema,
  bulkDeleteBodySchema,
  bulkDeleteCustomersBodySchema,
  bulkUpdateCustomerPlanBodySchema,
  createTicketBodySchema,
  listCustomersQuerySchema,
  listTicketsQuerySchema,
  reportBreakdownQuerySchema,
  reportRangeQuerySchema,
  updateTicketBodySchema,
} from '@support-desk/shared'
import { registerAuthRoutes, requireAdmin, requireSession } from './auth'
import { createCustomerStore, type CustomerStore } from './customerStore'
import { createLoginLimiter, type LoginLimiter } from './loginLimiter'
import { registerTicketMoveRoutes } from './moves'
import { buildAssignees, buildBreakdown, buildSummary } from './reports'
import { currentUser, fail, invalid, missing, readJsonBody, type AppEnv } from './respond'
import { registerSearchRoute } from './search'
import { createSessionStore, type SessionStore } from './sessionStore'
import { createTicketStore, type TicketStore } from './store'
import { createUserStore, type UserStore } from './userStore'

/**
 * The API the app talks to.
 *
 * Every request body and query string is parsed at the boundary, so nothing
 * unvalidated reaches the store, and every failure leaves through the one error
 * shape the client knows how to read.
 *
 * Every request is also authenticated. `requireSession` runs ahead of the routes
 * and refuses anything without a valid session cookie, so the only paths that
 * answer a stranger are the three that hand out a session. The destructive
 * routes go further and check the role: deleting a ticket and both bulk
 * endpoints are administrators' work, and an agent asking for them is refused
 * here rather than merely not offered the button.
 *
 * The app is built by a factory rather than exported as a singleton: the node
 * entry point gives it real latency, and the test suite gives it none and drives
 * `app.fetch` directly through MSW.
 */

export interface ApiAppOptions {
  store?: TicketStore
  /** Defaults to a store reading the queue above, so the two cannot disagree. */
  customers?: CustomerStore
  users?: UserStore
  /** Handed in by the web test suite, which needs to mint a session of its own. */
  sessions?: SessionStore
  limiter?: LoginLimiter
  /** Inclusive millisecond range added to every request. */
  latencyMs?: readonly [number, number]
  /** Fails every request, for exercising error states without a query param. */
  failAlways?: boolean
  /**
   * The clock the session expiry and the login rate limit are measured against.
   *
   * Injected rather than read so that a test can move time without fake timers,
   * which nothing else in this suite uses. It is only consulted by the two
   * stores built here; one passed in already carries its own.
   */
  now?: () => number
}

const DEFAULT_LATENCY_MS: readonly [number, number] = [150, 400]

function delay(range: readonly [number, number]): Promise<void> {
  const [min, max] = range

  if (max <= 0) {
    return Promise.resolve()
  }

  return new Promise((resolve) => setTimeout(resolve, min + Math.random() * (max - min)))
}

export function createApiApp(options: ApiAppOptions = {}) {
  const {
    store = createTicketStore(),
    // Reads the queue above rather than a copy of it, so a ticket deleted
    // through the routes below leaves its customer in the same breath.
    customers = createCustomerStore(store),
    users = createUserStore(),
    now = Date.now,
    sessions = createSessionStore(now),
    limiter = createLoginLimiter(now),
    latencyMs = DEFAULT_LATENCY_MS,
    failAlways = false,
  } = options

  const app = new Hono<AppEnv>()
  const adminOnly = requireAdmin()

  // Real requests are never instant, so neither are these: the loading states in
  // the UI stay real states that have to be handled.
  app.use('/api/*', async (_c, next) => {
    await delay(latencyMs)
    await next()
  })

  // The escape hatch for exercising error states: `?fail=1` on any request, or
  // the env flag the node entry point turns into `failAlways`.
  app.use('/api/*', async (c, next) => {
    if (failAlways || c.req.query('fail') === '1') {
      return fail(c, 500, 'forced_failure', 'The request failed because it was told to.')
    }

    await next()
  })

  // Last of the three, so a forced failure still fails for a signed-out caller
  // and the knob keeps working the way it is documented to.
  app.use('/api/*', requireSession({ users, sessions, limiter }))

  registerAuthRoutes(app, { users, sessions, limiter })

  // One question asked of everything at once. Registered from its own module,
  // like the auth routes: this function is against a line ceiling, and what it
  // answers with spans both stores rather than belonging to either.
  registerSearchRoute(app, { store, customers })

  // The workflow's three routes, from their own module for the same reason.
  // Registered ahead of the ticket routes below so that `POST /tickets/bulk/moves`
  // is matched before anything can read `bulk` as a ticket id.
  registerTicketMoveRoutes(app, { store })

  app.get('/api/me', (c) => c.json({ user: currentUser(c) }))

  app.get('/api/tickets', (c) => {
    const query = listTicketsQuerySchema.safeParse(c.req.query())

    if (!query.success) {
      return invalid(c, query.error, 'query string')
    }

    return c.json(store.list(query.data))
  })

  app.post('/api/tickets', async (c) => {
    const raw = await readJsonBody(c)

    if (!raw.ok) {
      return fail(c, 400, 'validation_failed', 'The request body is not valid JSON.')
    }

    const body = createTicketBodySchema.safeParse(raw.value)

    if (!body.success) {
      return invalid(c, body.error, 'ticket')
    }

    return c.json(store.create(body.data), 201)
  })

  // Registered ahead of `/api/tickets/:id` so that `bulk` is read as the
  // collection operation it is rather than as a ticket id.
  //
  // There is no bulk status route beside it any more. Applying a status to a
  // selection was the same defect as setting one on a ticket, in bulk; the
  // collection operation is now `POST /api/tickets/bulk/moves`, in `moves.ts`.
  app.delete('/api/tickets/bulk', adminOnly, async (c) => {
    const raw = await readJsonBody(c)

    if (!raw.ok) {
      return fail(c, 400, 'validation_failed', 'The request body is not valid JSON.')
    }

    const body = bulkDeleteBodySchema.safeParse(raw.value)

    if (!body.success) {
      return invalid(c, body.error, 'bulk delete')
    }

    return c.json({ deleted: store.bulkRemove(body.data.ids) })
  })

  app.get('/api/tickets/:id', (c) => {
    const id = c.req.param('id')
    const ticket = store.get(id)

    return ticket ? c.json(ticket) : missing(c, 'Ticket', id)
  })

  app.patch('/api/tickets/:id', async (c) => {
    const id = c.req.param('id')
    const raw = await readJsonBody(c)

    if (!raw.ok) {
      return fail(c, 400, 'validation_failed', 'The request body is not valid JSON.')
    }

    const body = updateTicketBodySchema.safeParse(raw.value)

    if (!body.success) {
      return invalid(c, body.error, 'ticket patch')
    }

    // A patch carries a priority and an assignee and nothing else: a status is
    // a position, reached by a move — see `moves.ts`.
    const ticket = store.update(id, body.data)

    return ticket ? c.json(ticket) : missing(c, 'Ticket', id)
  })

  app.delete('/api/tickets/:id', adminOnly, (c) => {
    const id = c.req.param('id')

    return store.remove(id) ? c.json({ deleted: 1 }) : missing(c, 'Ticket', id)
  })

  app.post('/api/tickets/:id/comments', async (c) => {
    const id = c.req.param('id')
    const raw = await readJsonBody(c)

    if (!raw.ok) {
      return fail(c, 400, 'validation_failed', 'The request body is not valid JSON.')
    }

    const body = addCommentBodySchema.safeParse(raw.value)

    if (!body.success) {
      return invalid(c, body.error, 'comment')
    }

    const ticket = store.addComment(id, body.data)

    return ticket ? c.json(ticket, 201) : missing(c, 'Ticket', id)
  })

  // The customer endpoints. The list is a cursor rather than a page number,
  // because the screen reading it appends rather than pages — see
  // `customerCursorSchema` in the shared contract for why that is not an offset.
  app.get('/api/customers', (c) => {
    const query = listCustomersQuerySchema.safeParse(c.req.query())

    if (!query.success) {
      return invalid(c, query.error, 'query string')
    }

    return c.json(customers.list(query.data))
  })

  // Registered ahead of `/api/customers/:id` for the same reason the ticket
  // bulk routes are: `bulk` is a collection operation, not a customer id.
  //
  // These are the only writes the customer store has, and both are behind
  // `adminOnly`. The UI hides them from an agent as well, and that is now a
  // convenience rather than the enforcement.
  app.patch('/api/customers/bulk', adminOnly, async (c) => {
    const raw = await readJsonBody(c)

    if (!raw.ok) {
      return fail(c, 400, 'validation_failed', 'The request body is not valid JSON.')
    }

    const body = bulkUpdateCustomerPlanBodySchema.safeParse(raw.value)

    if (!body.success) {
      return invalid(c, body.error, 'bulk plan change')
    }

    return c.json({ updated: customers.bulkUpdatePlan(body.data.ids, body.data.plan) })
  })

  app.delete('/api/customers/bulk', adminOnly, async (c) => {
    const raw = await readJsonBody(c)

    if (!raw.ok) {
      return fail(c, 400, 'validation_failed', 'The request body is not valid JSON.')
    }

    const body = bulkDeleteCustomersBodySchema.safeParse(raw.value)

    if (!body.success) {
      return invalid(c, body.error, 'bulk delete')
    }

    return c.json({ deleted: customers.bulkRemove(body.data.ids) })
  })

  app.get('/api/customers/:id', (c) => {
    const id = c.req.param('id')
    const customer = customers.get(id)

    return customer ? c.json(customer) : missing(c, 'Customer', id)
  })

  // The reporting endpoints. They read the whole queue and answer with figures:
  // the aggregation happens here so that a client never fetches tickets in order
  // to count them. Every one of them is bounded by the same validated range.
  //
  // All three are administrators' work, and refused here rather than merely
  // absent from the nav. `ReportAssigneeTable` ranks named agents by how much
  // each of them resolved, which is a manager's view of a team; every other
  // screen in this product is somebody's daily work. The nav, the route guard
  // and the global search all read the same `roles` on `NAVIGATION_TARGETS`, and
  // this is the half of it a client cannot talk its way past.
  app.get('/api/reports/summary', adminOnly, (c) => {
    const query = reportRangeQuerySchema.safeParse(c.req.query())

    if (!query.success) {
      return invalid(c, query.error, 'query string')
    }

    return c.json(buildSummary(store.snapshot(), query.data))
  })

  app.get('/api/reports/breakdown', adminOnly, (c) => {
    const query = reportBreakdownQuerySchema.safeParse(c.req.query())

    if (!query.success) {
      return invalid(c, query.error, 'query string')
    }

    return c.json(buildBreakdown(store.snapshot(), query.data))
  })

  app.get('/api/reports/assignees', adminOnly, (c) => {
    const query = reportRangeQuerySchema.safeParse(c.req.query())

    if (!query.success) {
      return invalid(c, query.error, 'query string')
    }

    return c.json(buildAssignees(store.snapshot(), query.data))
  })

  app.notFound((c) => fail(c, 404, 'not_found', `No route matches ${c.req.path}.`))

  app.onError((error, c) => {
    console.error(error)
    return fail(c, 500, 'server_error', 'The request could not be completed.')
  })

  return app
}

export type ApiApp = ReturnType<typeof createApiApp>
