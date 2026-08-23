import { describe, expect, it } from 'vitest'
import {
  apiErrorSchema,
  deletedCountSchema,
  listTicketsResponseSchema,
  meResponseSchema,
  ticketSchema,
  updatedCountSchema,
} from '@harness-sample/shared'
import { createApiApp, type ApiAppOptions } from './app'

/**
 * The API is exercised through `app.request`, which is the same path a real
 * request takes, minus the socket. Responses are parsed with the contract
 * schemas rather than poked at, so a route that stops matching what the client
 * expects fails here rather than in the browser.
 */
function createApp(options: ApiAppOptions = {}) {
  return createApiApp({ latencyMs: [0, 0], ...options })
}

const jsonRequest = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

async function expectError(response: Response, status: number, code: string): Promise<string[]> {
  expect(response.status).toBe(status)

  const body = apiErrorSchema.parse(await response.json())
  expect(body.error.code).toBe(code)

  return body.error.details ?? []
}

describe('GET /api/tickets', () => {
  it('returns the first page of the seeded queue by default', async () => {
    const response = await createApp().request('/api/tickets')

    expect(response.status).toBe(200)

    const body = listTicketsResponseSchema.parse(await response.json())

    expect(body).toMatchObject({ total: 40, page: 1, pageCount: 4 })
    expect(body.rows).toHaveLength(10)
  })

  it('filters on status, priority and a search over title and id', async () => {
    const app = createApp()

    const byStatus = listTicketsResponseSchema.parse(
      await (await app.request('/api/tickets?status=resolved&pageSize=50')).json(),
    )
    expect(byStatus.rows.every((ticket) => ticket.status === 'resolved')).toBe(true)
    expect(byStatus.total).toBe(13)

    const byPriority = listTicketsResponseSchema.parse(
      await (await app.request('/api/tickets?priority=high&pageSize=50')).json(),
    )
    expect(byPriority.rows.every((ticket) => ticket.priority === 'high')).toBe(true)

    const byTitle = listTicketsResponseSchema.parse(
      await (await app.request('/api/tickets?search=INVOICE')).json(),
    )
    expect(byTitle.rows.map((ticket) => ticket.title)).toEqual([
      'Invoice PDF downloads as a zero-byte file',
    ])

    const byId = listTicketsResponseSchema.parse(
      await (await app.request('/api/tickets?search=tck-0007')).json(),
    )
    expect(byId.rows.map((ticket) => ticket.id)).toEqual(['TCK-0007'])
  })

  it('lands on the last page rather than past the end', async () => {
    const response = await createApp().request('/api/tickets?page=99')

    expect(listTicketsResponseSchema.parse(await response.json())).toMatchObject({
      page: 4,
      pageCount: 4,
    })
  })

  it('rejects a query string it cannot make sense of', async () => {
    const details = await expectError(
      await createApp().request('/api/tickets?status=escalated&page=0&pageSize=99999'),
      400,
      'validation_failed',
    )

    expect(details).toHaveLength(3)
    expect(details.join('\n')).toContain('status:')
  })
})

describe('GET /api/tickets/:id', () => {
  it('returns one ticket with its comments', async () => {
    const response = await createApp().request('/api/tickets/TCK-0001')
    const ticket = ticketSchema.parse(await response.json())

    expect(response.status).toBe(200)
    expect(ticket.id).toBe('TCK-0001')
  })

  it('is a 404 for a ticket that does not exist', async () => {
    await expectError(await createApp().request('/api/tickets/TCK-9999'), 404, 'not_found')
  })
})

describe('POST /api/tickets', () => {
  it('creates a ticket and returns it', async () => {
    const app = createApp()
    const response = await app.request(
      '/api/tickets',
      jsonRequest('POST', {
        title: 'Checkout page returns a 500',
        description: 'Happens on every card payment.',
        priority: 'high',
        assignee: 'Dana Whitfield',
      }),
    )

    expect(response.status).toBe(201)

    const ticket = ticketSchema.parse(await response.json())
    expect(ticket).toMatchObject({ id: 'TCK-0041', status: 'open', comments: [] })

    const list = listTicketsResponseSchema.parse(
      await (await app.request('/api/tickets')).json(),
    )
    expect(list.total).toBe(41)
  })

  it('names every field it rejected', async () => {
    const details = await expectError(
      await createApp().request('/api/tickets', jsonRequest('POST', { title: 'Bug' })),
      400,
      'validation_failed',
    )

    expect(details.map((detail) => detail.split(':')[0])).toEqual([
      'title',
      'description',
      'priority',
      'assignee',
    ])
  })

  it('treats a body that is not JSON as a validation failure, not a crash', async () => {
    const response = await createApp().request('/api/tickets', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not json',
    })

    await expectError(response, 400, 'validation_failed')
  })
})

describe('PATCH /api/tickets/:id', () => {
  it('applies a partial update and leaves the rest alone', async () => {
    const app = createApp()
    const before = ticketSchema.parse(await (await app.request('/api/tickets/TCK-0002')).json())

    const response = await app.request(
      '/api/tickets/TCK-0002',
      jsonRequest('PATCH', { status: 'closed' }),
    )
    const after = ticketSchema.parse(await response.json())

    expect(response.status).toBe(200)
    expect(after.status).toBe('closed')
    expect(after.priority).toBe(before.priority)
    expect(after.assignee).toBe(before.assignee)
  })

  it('rejects a patch that asks for nothing', async () => {
    const details = await expectError(
      await createApp().request('/api/tickets/TCK-0002', jsonRequest('PATCH', {})),
      400,
      'validation_failed',
    )

    expect(details).toEqual(['Provide at least one of status, priority or assignee.'])
  })

  it('is a 404 for a ticket that does not exist', async () => {
    await expectError(
      await createApp().request('/api/tickets/TCK-9999', jsonRequest('PATCH', { status: 'open' })),
      404,
      'not_found',
    )
  })
})

describe('POST /api/tickets/:id/comments', () => {
  it('appends a comment and returns the whole ticket', async () => {
    const app = createApp()
    const before = ticketSchema.parse(await (await app.request('/api/tickets/TCK-0003')).json())

    const response = await app.request(
      '/api/tickets/TCK-0003/comments',
      jsonRequest('POST', { author: 'You (Agent)', body: 'Looking into it.' }),
    )

    expect(response.status).toBe(201)

    const after = ticketSchema.parse(await response.json())
    expect(after.comments).toHaveLength(before.comments.length + 1)
    expect(after.comments.at(-1)).toMatchObject({
      author: 'You (Agent)',
      body: 'Looking into it.',
    })
  })

  it('rejects an empty comment', async () => {
    await expectError(
      await createApp().request(
        '/api/tickets/TCK-0003/comments',
        jsonRequest('POST', { author: 'You (Agent)', body: '   ' }),
      ),
      400,
      'validation_failed',
    )
  })
})

describe('the bulk endpoints', () => {
  it('updates the status of several tickets and reports how many changed', async () => {
    const app = createApp()
    const response = await app.request(
      '/api/tickets/bulk',
      jsonRequest('PATCH', { ids: ['TCK-0001', 'TCK-0002', 'TCK-9999'], status: 'closed' }),
    )

    expect(response.status).toBe(200)
    expect(updatedCountSchema.parse(await response.json())).toEqual({ updated: 2 })

    const ticket = ticketSchema.parse(await (await app.request('/api/tickets/TCK-0001')).json())
    expect(ticket.status).toBe('closed')
  })

  it('deletes several tickets and reports how many went', async () => {
    const app = createApp()
    const response = await app.request(
      '/api/tickets/bulk',
      jsonRequest('DELETE', { ids: ['TCK-0001', 'TCK-0002'] }),
    )

    expect(response.status).toBe(200)
    expect(deletedCountSchema.parse(await response.json())).toEqual({ deleted: 2 })

    const list = listTicketsResponseSchema.parse(
      await (await app.request('/api/tickets')).json(),
    )
    expect(list.total).toBe(38)
  })

  it('reads `bulk` as the collection operation rather than as a ticket id', async () => {
    // A 404 here would mean the request had fallen through to /api/tickets/:id.
    await expectError(
      await createApp().request('/api/tickets/bulk', jsonRequest('PATCH', { ids: [] })),
      400,
      'validation_failed',
    )
  })
})

describe('DELETE /api/tickets/:id', () => {
  it('removes the ticket', async () => {
    const app = createApp()
    const response = await app.request('/api/tickets/TCK-0004', { method: 'DELETE' })

    expect(deletedCountSchema.parse(await response.json())).toEqual({ deleted: 1 })
    await expectError(await app.request('/api/tickets/TCK-0004'), 404, 'not_found')
  })
})

describe('GET /api/me', () => {
  it('reports the role the server was started with', async () => {
    expect(meResponseSchema.parse(await (await createApp().request('/api/me')).json())).toEqual({
      role: 'agent',
    })

    expect(
      meResponseSchema.parse(await (await createApp({ role: 'admin' }).request('/api/me')).json()),
    ).toEqual({ role: 'admin' })
  })
})

describe('forced failures', () => {
  it('fails a single request on ?fail=1', async () => {
    const app = createApp()

    await expectError(await app.request('/api/tickets?fail=1'), 500, 'forced_failure')
    expect((await app.request('/api/tickets')).status).toBe(200)
  })

  it('fails everything when the server is started that way', async () => {
    const app = createApp({ failAlways: true })

    await expectError(await app.request('/api/tickets'), 500, 'forced_failure')
    await expectError(await app.request('/api/me'), 500, 'forced_failure')
  })
})

describe('an unknown route', () => {
  it('answers in the same error shape as everything else', async () => {
    await expectError(await createApp().request('/api/nope'), 404, 'not_found')
  })
})
