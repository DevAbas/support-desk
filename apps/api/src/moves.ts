import type { Hono } from 'hono'
import {
  bulkTicketMoveBodySchema,
  ticketMoveBodySchema,
  type ApiErrorCode,
  type TicketMoveRefusal,
  type TicketMoveRefusalKind,
} from '@support-desk/shared'
import { requireAdmin } from './auth'
import {
  currentUser,
  fail,
  invalid,
  missing,
  readJsonBody,
  type ApiContext,
  type AppEnv,
} from './respond'
import type { TicketMoveCommand, TicketStore } from './store'

/**
 * The three routes a status change goes through.
 *
 * They live here rather than in `app.ts` for the reason the search and the
 * reports do: `createApiApp` is one function against a line ceiling it is
 * already close to, and "just one more route" never stops being true in the file
 * that wires every route together.
 *
 * **A status is not a field these routes write.** `PATCH /api/tickets/:id` no
 * longer accepts one; the only way a ticket changes status is a named move, and
 * a move is refused here as well as being absent from the interface. The rules
 * themselves are in `packages/shared/src/workflow.ts` — this file is the wire
 * around them and the mapping from a refusal to a status code.
 *
 * **A refusal answers with the condition, not with the refusal.** The message
 * body is the requirement sentence the workflow produced, so a client renders
 * `error.message` and shows a person what was not true. Nothing here composes
 * prose of its own.
 */

export interface TicketMoveDeps {
  store: TicketStore
}

/**
 * Which status a refusal leaves through.
 *
 * A role refusal is a 403, the same as every other "we know who you are and the
 * answer is still no" in this API. A ticket that has moved on under the caller,
 * or one that does not meet a condition, is a 409: the request was well formed
 * and about a real ticket, and it is the state of that ticket that disagrees.
 *
 * Keyed by the union so a fourth kind of refusal cannot be added in the
 * workflow without deciding what it looks like on the wire.
 */
const STATUS_BY_REFUSAL: Record<TicketMoveRefusalKind, { status: 403 | 409; code: ApiErrorCode }> = {
  role: { status: 403, code: 'forbidden' },
  position: { status: 409, code: 'conflict' },
  guard: { status: 409, code: 'conflict' },
}

function refuse(c: ApiContext, refusal: TicketMoveRefusal) {
  const { status, code } = STATUS_BY_REFUSAL[refusal.kind]

  return fail(c, status, code, refusal.requirement)
}

export function registerTicketMoveRoutes(app: Hono<AppEnv>, { store }: TicketMoveDeps): void {
  const adminOnly = requireAdmin()

  /*
   * Registered ahead of `/api/tickets/:id/moves` so that `bulk` is read as the
   * collection operation it is rather than as a ticket id, the same way the
   * other two bulk routes are.
   *
   * Behind `adminOnly` like every other bulk endpoint. Working a queue one
   * ticket at a time is an agent's job; moving forty at once is not, and that
   * gate is about the size of the action rather than about the move — which is
   * why it is a middleware here and not a `roles` entry in the workflow.
   */
  app.post('/api/tickets/bulk/moves', adminOnly, async (c) => {
    const raw = await readJsonBody(c)

    if (!raw.ok) {
      return fail(c, 400, 'validation_failed', 'The request body is not valid JSON.')
    }

    const body = bulkTicketMoveBodySchema.safeParse(raw.value)

    if (!body.success) {
      return invalid(c, body.error, 'bulk move')
    }

    return c.json(store.bulkMove(body.data.ids, toCommand(c, body.data)))
  })

  /*
   * What the interface asks, and the reason it does not decide. It may hide a
   * move it has been told is unavailable; it never works out availability
   * itself, because the conditions read ticket state a browser can hold a stale
   * copy of and the role rule must not have a second implementation.
   */
  app.get('/api/tickets/:id/moves', (c) => {
    const id = c.req.param('id')
    const moves = store.movesFor(id, currentUser(c).role)

    return moves ? c.json({ moves }) : missing(c, 'Ticket', id)
  })

  app.post('/api/tickets/:id/moves', async (c) => {
    const id = c.req.param('id')
    const raw = await readJsonBody(c)

    if (!raw.ok) {
      return fail(c, 400, 'validation_failed', 'The request body is not valid JSON.')
    }

    const body = ticketMoveBodySchema.safeParse(raw.value)

    if (!body.success) {
      return invalid(c, body.error, 'move')
    }

    const result = store.move(id, toCommand(c, body.data))

    if (!result) {
      return missing(c, 'Ticket', id)
    }

    return result.ok ? c.json(result.ticket) : refuse(c, result.refusal)
  })
}

/**
 * The session decides who is moving the ticket, in both directions: their name
 * goes in the history and their role goes to the workflow. Neither is a
 * parameter, so there is nothing a caller can say to be judged as somebody else
 * or to sign somebody else's name to a reopening.
 */
function toCommand(
  c: ApiContext,
  body: { move: TicketMoveCommand['move']; reason?: string },
): TicketMoveCommand {
  const user = currentUser(c)

  return { move: body.move, reason: body.reason, by: user.name, role: user.role }
}
