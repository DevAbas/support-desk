import { describe, expect, it } from 'vitest'
import {
  apiErrorSchema,
  bulkTicketMoveResponseSchema,
  ticketMoveOffersResponseSchema,
  ticketSchema,
  TICKET_GUARDS,
} from '@support-desk/shared'
import { createApp } from './test/support'
import { SEED_AGENT_EMAIL } from './userSeed'

/**
 * The workflow's three routes.
 *
 * `workflow.test.ts` in `packages/shared` covers the rules themselves — which
 * moves exist, who may make them, what has to be true first — so these cases are
 * about the wire around them: which status code a refusal leaves through, that
 * the refused ticket did not move anyway, and what a bulk move answers for a
 * selection whose rows do not all have the same move available.
 *
 * `createApp` is signed in as the admin by default; the cases that need to be
 * refused pass the agent's email.
 *
 * The seeded queue these lean on:
 *
 * | Ticket | Status | Assignee |
 * | --- | --- | --- |
 * | TCK-0004 | open | Ren Nakamura |
 * | TCK-0038 | open | Unassigned |
 * | TCK-0032 | pending | Marco Ellis |
 * | TCK-0002 | resolved | Priya Raman |
 * | TCK-0001 | closed | Priya Raman |
 */

const jsonRequest = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

async function expectError(response: Response, status: number, code: string): Promise<string> {
  expect(response.status).toBe(status)

  const body = apiErrorSchema.parse(await response.json())
  expect(body.error.code).toBe(code)

  return body.error.message
}

async function movesFor(
  app: ReturnType<typeof createApp>,
  id: string,
): Promise<ReturnType<typeof ticketMoveOffersResponseSchema.parse>['moves']> {
  const response = await app.request(`/api/tickets/${id}/moves`)

  expect(response.status).toBe(200)

  return ticketMoveOffersResponseSchema.parse(await response.json()).moves
}

describe('GET /api/tickets/:id/moves', () => {
  it('answers with what can be done from where the ticket is', async () => {
    expect(await movesFor(createApp(), 'TCK-0004')).toEqual([
      { id: 'start', available: true, requirement: null },
    ])
  })

  it('carries the condition a blocked move is waiting on', async () => {
    // Open, and nobody owns it, so it cannot be worked yet — and the answer
    // says what is missing rather than leaving the move out.
    expect(await movesFor(createApp(), 'TCK-0038')).toEqual([
      { id: 'start', available: false, requirement: TICKET_GUARDS.assigned.requirement },
    ])
  })

  it('leaves out a move the caller may not make, whoever asks', async () => {
    expect(await movesFor(createApp({}, SEED_AGENT_EMAIL), 'TCK-0001')).toEqual([])
    expect(await movesFor(createApp(), 'TCK-0001')).toEqual([
      { id: 'reopen', available: true, requirement: null },
    ])
  })

  it('is a 404 for a ticket that does not exist', async () => {
    await expectError(await createApp().request('/api/tickets/TCK-9999/moves'), 404, 'not_found')
  })
})

describe('POST /api/tickets/:id/moves', () => {
  it('moves the ticket, answers with all of it, and writes the move down', async () => {
    const app = createApp({}, SEED_AGENT_EMAIL)
    const response = await app.request(
      '/api/tickets/TCK-0004/moves',
      jsonRequest('POST', { move: 'start' }),
    )

    expect(response.status).toBe(200)

    const ticket = ticketSchema.parse(await response.json())
    expect(ticket.status).toBe('pending')
    expect(ticket.history).toHaveLength(1)
    expect(ticket.history[0]).toMatchObject({
      transition: 'start',
      from: 'open',
      to: 'pending',
      // The session says who, so there is nothing a caller can send to sign
      // somebody else's name to a move.
      by: 'Marco Ellis',
      reason: null,
    })

    // And what can be done next has changed with it.
    expect(await movesFor(app, 'TCK-0004')).toEqual([
      { id: 'resolve', available: true, requirement: null },
      { id: 'release', available: true, requirement: null },
    ])
  })

  it('refuses a move out of somewhere the ticket is not, naming both positions', async () => {
    const app = createApp()
    const message = await expectError(
      await app.request('/api/tickets/TCK-0004/moves', jsonRequest('POST', { move: 'close' })),
      409,
      'conflict',
    )

    expect(message).toBe('Close is a move out of Resolved, and this ticket is Open.')

    const ticket = ticketSchema.parse(await (await app.request('/api/tickets/TCK-0004')).json())
    expect(ticket.status).toBe('open')
    expect(ticket.history).toEqual([])
  })

  it('refuses to work a ticket nobody owns, and says what is missing', async () => {
    const app = createApp()
    const message = await expectError(
      await app.request('/api/tickets/TCK-0038/moves', jsonRequest('POST', { move: 'start' })),
      409,
      'conflict',
    )

    // The condition, not the refusal: it says what to do next.
    expect(message).toBe(TICKET_GUARDS.assigned.requirement)

    const ticket = ticketSchema.parse(await (await app.request('/api/tickets/TCK-0038')).json())
    expect(ticket.status).toBe('open')
  })

  it('refuses an agent a move that is not theirs, even though the interface never offered it', async () => {
    const app = createApp({}, SEED_AGENT_EMAIL)
    const message = await expectError(
      await app.request(
        '/api/tickets/TCK-0001/moves',
        jsonRequest('POST', { move: 'reopen', reason: 'The customer came back.' }),
      ),
      403,
      'forbidden',
    )

    expect(message).toBe('Reopen is for administrators.')

    const ticket = ticketSchema.parse(await (await app.request('/api/tickets/TCK-0001')).json())
    expect(ticket.status).toBe('closed')
  })

  it('will not reopen a closed ticket without a reason, and keeps the one it is given', async () => {
    const app = createApp()

    const message = await expectError(
      await app.request('/api/tickets/TCK-0001/moves', jsonRequest('POST', { move: 'reopen' })),
      409,
      'conflict',
    )
    expect(message).toBe(TICKET_GUARDS.reason.requirement)

    const response = await app.request(
      '/api/tickets/TCK-0001/moves',
      jsonRequest('POST', { move: 'reopen', reason: 'Same fault reported again on Tuesday.' }),
    )
    const ticket = ticketSchema.parse(await response.json())

    expect(ticket.status).toBe('open')
    expect(ticket.history.at(-1)).toMatchObject({
      transition: 'reopen',
      from: 'closed',
      to: 'open',
      by: 'Dana Whitfield',
      reason: 'Same fault reported again on Tuesday.',
    })
  })

  it('does not keep a reason nobody asked for', async () => {
    const app = createApp()
    const response = await app.request(
      '/api/tickets/TCK-0002/moves',
      jsonRequest('POST', { move: 'close', reason: 'Volunteered, and not wanted.' }),
    )

    // A sentence stored against a forward move is a sentence in the history
    // that nobody will ever go looking for.
    expect(ticketSchema.parse(await response.json()).history.at(-1)?.reason).toBeNull()
  })

  it('rejects a move it has never heard of', async () => {
    await expectError(
      await createApp().request(
        '/api/tickets/TCK-0004/moves',
        jsonRequest('POST', { move: 'escalate' }),
      ),
      400,
      'validation_failed',
    )
  })

  it('is a 404 for a ticket that does not exist', async () => {
    await expectError(
      await createApp().request(
        '/api/tickets/TCK-9999/moves',
        jsonRequest('POST', { move: 'start' }),
      ),
      404,
      'not_found',
    )
  })
})

describe('POST /api/tickets/bulk/moves', () => {
  it('moves every ticket that can take it and reports the rest with the condition', async () => {
    const app = createApp()
    const response = await app.request(
      '/api/tickets/bulk/moves',
      jsonRequest('POST', {
        // Open and owned, open and unowned, and one that is not open at all.
        ids: ['TCK-0004', 'TCK-0038', 'TCK-0002'],
        move: 'start',
      }),
    )

    expect(response.status).toBe(200)

    const result = bulkTicketMoveResponseSchema.parse(await response.json())

    expect(result.moved).toEqual(['TCK-0004'])
    expect(result.left).toEqual([
      { id: 'TCK-0038', requirement: TICKET_GUARDS.assigned.requirement },
      {
        id: 'TCK-0002',
        requirement: 'Start work is a move out of Open, and this ticket is Resolved.',
      },
    ])

    // The ids are the point of answering this way: the two that were left are
    // the ones still needing something, and a bar can keep them selected.
    const untouched = ticketSchema.parse(
      await (await app.request('/api/tickets/TCK-0002')).json(),
    )
    expect(untouched.status).toBe('resolved')
  })

  it('neither moves nor reports an id that names no ticket', async () => {
    const app = createApp()
    const response = await app.request(
      '/api/tickets/bulk/moves',
      jsonRequest('POST', { ids: ['TCK-0004', 'TCK-9999'], move: 'start' }),
    )

    // A selection is made on a page that may have moved on since, and a ticket
    // that is gone is not a condition anybody can meet.
    expect(bulkTicketMoveResponseSchema.parse(await response.json())).toEqual({
      moved: ['TCK-0004'],
      left: [],
    })
  })

  it('refuses an agent, the way every other bulk endpoint does', async () => {
    const app = createApp({}, SEED_AGENT_EMAIL)

    await expectError(
      await app.request(
        '/api/tickets/bulk/moves',
        jsonRequest('POST', { ids: ['TCK-0004'], move: 'start' }),
      ),
      403,
      'forbidden',
    )

    const ticket = ticketSchema.parse(await (await app.request('/api/tickets/TCK-0004')).json())
    expect(ticket.status).toBe('open')
  })

  it('reads `bulk` as the collection operation rather than as a ticket id', async () => {
    // A 404 here would mean the request had fallen through to
    // `/api/tickets/:id/moves` with `bulk` read as the id.
    const response = await createApp().request(
      '/api/tickets/bulk/moves',
      jsonRequest('POST', { ids: ['TCK-0004'], move: 'start' }),
    )

    expect(response.status).toBe(200)
    expect(bulkTicketMoveResponseSchema.parse(await response.json()).moved).toEqual(['TCK-0004'])
  })
})
