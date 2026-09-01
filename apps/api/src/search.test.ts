import { describe, expect, it } from 'vitest'
import {
  apiErrorSchema,
  searchResponseSchema,
  type SearchGroup,
  type SearchResponse,
  type SearchResultType,
} from '@support-desk/shared'
import { createApp, createSignedOutApp } from './test/support'
import { SEED_AGENT_EMAIL } from './userSeed'

/**
 * The global search endpoint, exercised through `app.request` like every other
 * route here, with each response parsed by the contract schema rather than poked
 * at.
 *
 * The figures below are fixed properties of the seed. Priya Raman is the busiest
 * assignee, with eight tickets, and is also one of the sixty customers — which
 * makes her the one query that lands in two groups at once and the reason she is
 * used throughout. Northwind Labs has three customers and no ticket bearing its
 * name.
 */

const BUSY_ASSIGNEE = 'Priya Raman'

const BUSY_ASSIGNEE_TICKETS = 8

function url(query: Record<string, string>): string {
  return `/api/search?${new URLSearchParams(query).toString()}`
}

async function search(
  app: ReturnType<typeof createApp>,
  query: Record<string, string>,
): Promise<SearchResponse> {
  const response = await app.request(url(query))

  expect(response.status).toBe(200)

  return searchResponseSchema.parse(await response.json())
}

/** The group of a kind, or a stand-in empty one: an absent group found nothing. */
function group(body: SearchResponse, type: SearchResultType): SearchGroup {
  return body.groups.find((candidate) => candidate.type === type) ?? { type, total: 0, results: [] }
}

function titlesIn(body: SearchResponse, type: SearchResultType): string[] {
  return group(body, type).results.map((result) => {
    switch (result.type) {
      case 'ticket':
        return result.id
      case 'customer':
        return result.name
      case 'navigation':
        return result.label
    }
  })
}

async function expectError(response: Response, status: number, code: string): Promise<void> {
  expect(response.status).toBe(status)

  const body = apiErrorSchema.parse(await response.json())
  expect(body.error.code).toBe(code)
}

describe('GET /api/search', () => {
  it('answers an empty query with nothing at all', async () => {
    const body = await search(createApp(), { q: '' })

    // Not every ticket in the queue, which is what an empty substring matches.
    expect(body.groups).toEqual([])
  })

  it('answers a query nothing matches with nothing, rather than an error', async () => {
    const body = await search(createApp(), { q: 'zzzznothinghere' })

    expect(body.groups).toEqual([])
  })

  it('finds a ticket by its id', async () => {
    const body = await search(createApp(), { q: 'TCK-0007' })

    expect(titlesIn(body, 'ticket')).toEqual(['TCK-0007'])
  })

  it('finds a ticket by a word in its title', async () => {
    const body = await search(createApp(), { q: 'invoice' })

    expect(group(body, 'ticket').results).toHaveLength(1)
    expect(group(body, 'ticket').results[0]).toMatchObject({
      type: 'ticket',
      title: 'Invoice PDF downloads as a zero-byte file',
    })
  })

  it('finds a ticket by who it is assigned to, which the ticket list cannot', async () => {
    const app = createApp()

    const body = await search(app, { q: BUSY_ASSIGNEE, limit: '20' })
    expect(group(body, 'ticket').total).toBe(BUSY_ASSIGNEE_TICKETS)

    // The same term through the ticket list, which reads a title and an id and
    // not an assignee: the two endpoints answer different questions on purpose.
    const listed = await app.request(
      `/api/tickets?${new URLSearchParams({ search: BUSY_ASSIGNEE }).toString()}`,
    )
    expect(((await listed.json()) as { total: number }).total).toBe(0)
  })

  it('puts an exactly matching id above a newer ticket that only mentions it', async () => {
    const app = createApp()

    await app.request('/api/tickets', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'Duplicate of TCK-0007 raised again this morning',
        description: 'Same webhook retries, reported by a second account.',
        priority: 'low',
        assignee: 'Marco Ellis',
      }),
    })

    const body = await search(app, { q: 'TCK-0007' })

    // Both match. The newer one would come first on recency alone, and the id
    // somebody typed in full is the one they asked for.
    expect(titlesIn(body, 'ticket')).toEqual(['TCK-0007', 'TCK-0041'])
  })

  it('finds a customer by name, by company and by email', async () => {
    const app = createApp()

    expect(titlesIn(await search(app, { q: 'priya raman' }), 'customer')).toEqual([BUSY_ASSIGNEE])
    expect(group(await search(app, { q: 'northwind' }), 'customer').total).toBe(3)
    expect(
      titlesIn(await search(app, { q: 'priya.raman@northwindlabs.example' }), 'customer'),
    ).toEqual([BUSY_ASSIGNEE])
  })

  it('finds a screen by its name', async () => {
    const body = await search(createApp(), { q: 'reports' })

    expect(titlesIn(body, 'navigation')).toEqual(['Reports'])
  })

  it('finds a screen by a word nobody wrote on it', async () => {
    const body = await search(createApp(), { q: 'inbox' })

    // The queue is not called an inbox anywhere on screen, and it is the thing
    // somebody typing that is looking for.
    expect(titlesIn(body, 'navigation')).toEqual(['Tickets'])
  })

  it('orders the groups tickets, customers, then screens', async () => {
    // One term that lands in all three at once: an audit-log ticket, Riverbend
    // Logistics, and "log" as a word somebody raising a ticket would type.
    const body = await search(createApp(), { q: 'log' })

    expect(body.groups.map((candidate) => candidate.type)).toEqual([
      'ticket',
      'customer',
      'navigation',
    ])
  })

  it('serves a handful per group and says how many there were', async () => {
    const body = await search(createApp(), { q: BUSY_ASSIGNEE, limit: '3' })

    expect(group(body, 'ticket').results).toHaveLength(3)
    expect(group(body, 'ticket').total).toBe(BUSY_ASSIGNEE_TICKETS)
  })

  it('leaves out a group that found nothing rather than heading an empty one', async () => {
    const body = await search(createApp(), { q: 'northwind' })

    expect(body.groups.map((candidate) => candidate.type)).toEqual(['customer'])
  })

  it('refuses a limit past the maximum', async () => {
    await expectError(await createApp().request(url({ q: 'a', limit: '500' })), 400, 'validation_failed')
  })

  it('refuses a caller with no session', async () => {
    await expectError(await createSignedOutApp().request(url({ q: 'a' })), 401, 'unauthorized')
  })
})

describe('what an agent is allowed to find', () => {
  it('does not offer an agent the reports screen, which they cannot reach', async () => {
    const agent = await search(createApp({}, SEED_AGENT_EMAIL), { q: 'reports' })
    const admin = await search(createApp(), { q: 'reports' })

    expect(titlesIn(agent, 'navigation')).toEqual([])
    expect(titlesIn(admin, 'navigation')).toEqual(['Reports'])
  })

  it('leaves an agent everything they do have a way in to', async () => {
    const body = await search(createApp({}, SEED_AGENT_EMAIL), { q: BUSY_ASSIGNEE, limit: '20' })

    expect(group(body, 'ticket').total).toBe(BUSY_ASSIGNEE_TICKETS)
    expect(titlesIn(body, 'customer')).toEqual([BUSY_ASSIGNEE])
  })

  it('answers the same query differently for the two roles', async () => {
    const agent = await search(createApp({}, SEED_AGENT_EMAIL), { q: 'the' })
    const admin = await search(createApp(), { q: 'the' })

    expect(titlesIn(admin, 'navigation')).toContain('Reports')
    expect(titlesIn(agent, 'navigation')).not.toContain('Reports')
  })
})
