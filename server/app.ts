import { Hono } from 'hono'
import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { z } from 'zod'
import {
  addCommentBodySchema,
  bulkDeleteBodySchema,
  bulkUpdateBodySchema,
  createTicketBodySchema,
  listTicketsQuerySchema,
  updateTicketBodySchema,
  type ApiErrorBody,
  type ApiErrorCode,
} from '../src/lib/api/contract'
import type { Role } from '../src/lib/types'
import { createTicketStore, type TicketStore } from './store'

/**
 * The API the app talks to.
 *
 * Every request body and query string is parsed at the boundary, so nothing
 * unvalidated reaches the store, and every failure leaves through the one error
 * shape the client knows how to read.
 *
 * The app is built by a factory rather than exported as a singleton: the node
 * entry point gives it real latency, and the test suite gives it none and drives
 * `app.fetch` directly through MSW.
 */

export interface ApiAppOptions {
  store?: TicketStore
  /** Inclusive millisecond range added to every request. */
  latencyMs?: readonly [number, number]
  /** Fails every request, for exercising error states without a query param. */
  failAlways?: boolean
  /** Who `GET /api/me` reports as signed in. There is no authentication here. */
  role?: Role
}

const DEFAULT_LATENCY_MS: readonly [number, number] = [150, 400]

function delay(range: readonly [number, number]): Promise<void> {
  const [min, max] = range

  if (max <= 0) {
    return Promise.resolve()
  }

  return new Promise((resolve) => setTimeout(resolve, min + Math.random() * (max - min)))
}

function errorBody(code: ApiErrorCode, message: string, details?: string[]): ApiErrorBody {
  return { error: details ? { code, message, details } : { code, message } }
}

function fail(
  c: Context,
  status: ContentfulStatusCode,
  code: ApiErrorCode,
  message: string,
  details?: string[],
) {
  return c.json(errorBody(code, message, details), status)
}

/** One entry per failed field: `title: Too small: expected string to have >=5`. */
function formatIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.join('.')
    return path === '' ? issue.message : `${path}: ${issue.message}`
  })
}

function invalid(c: Context, error: z.ZodError, subject: string) {
  return fail(c, 400, 'validation_failed', `The ${subject} is not valid.`, formatIssues(error))
}

function missing(c: Context, id: string) {
  return fail(c, 404, 'not_found', `Ticket ${id} was not found.`)
}

/**
 * Reads a JSON body without letting a malformed one become a 500. An absent or
 * unparseable body is reported as the validation failure it is.
 */
async function readJsonBody(c: Context): Promise<{ ok: true; value: unknown } | { ok: false }> {
  try {
    return { ok: true, value: await c.req.json<unknown>() }
  } catch {
    return { ok: false }
  }
}

export function createApiApp(options: ApiAppOptions = {}) {
  const {
    store = createTicketStore(),
    latencyMs = DEFAULT_LATENCY_MS,
    failAlways = false,
    role = 'agent',
  } = options

  const app = new Hono()

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

  app.get('/api/me', (c) => c.json({ role }))

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
  app.patch('/api/tickets/bulk', async (c) => {
    const raw = await readJsonBody(c)

    if (!raw.ok) {
      return fail(c, 400, 'validation_failed', 'The request body is not valid JSON.')
    }

    const body = bulkUpdateBodySchema.safeParse(raw.value)

    if (!body.success) {
      return invalid(c, body.error, 'bulk update')
    }

    return c.json({ updated: store.bulkUpdateStatus(body.data.ids, body.data.status) })
  })

  app.delete('/api/tickets/bulk', async (c) => {
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

    return ticket ? c.json(ticket) : missing(c, id)
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

    const ticket = store.update(id, body.data)

    return ticket ? c.json(ticket) : missing(c, id)
  })

  app.delete('/api/tickets/:id', (c) => {
    const id = c.req.param('id')

    return store.remove(id) ? c.json({ deleted: 1 }) : missing(c, id)
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

    return ticket ? c.json(ticket, 201) : missing(c, id)
  })

  app.notFound((c) => fail(c, 404, 'not_found', `No route matches ${c.req.path}.`))

  app.onError((error, c) => {
    console.error(error)
    return fail(c, 500, 'server_error', 'The request could not be completed.')
  })

  return app
}

export type ApiApp = ReturnType<typeof createApiApp>
