import { describe, expect, it } from 'vitest'
import {
  apiErrorSchema,
  customerSchema,
  deletedCountSchema,
  listCustomersResponseSchema,
  updatedCountSchema,
  type ListCustomersResponse,
} from '@support-desk/shared'
import { createApp } from './test/support'

/**
 * The customer endpoints, exercised the same way as the ticket routes: through
 * `app.request`, with every response parsed by the contract schema rather than
 * poked at, and signed in as the admin — see `test/support`.
 *
 * The figures below are fixed properties of the seed — sixty customers, ten of
 * whom have raised something — and not counts read back off the code under test.
 */
const CUSTOMER_COUNT = 60

/** The eight-ticket account. Used wherever a test needs one that is not empty. */
const BUSY_CUSTOMER_ID = 'CUS-0001'

function url(path: string, query: Record<string, string>): string {
  return `${path}?${new URLSearchParams(query).toString()}`
}

async function listCustomers(
  app: ReturnType<typeof createApp>,
  query: Record<string, string> = {},
): Promise<ListCustomersResponse> {
  const response = await app.request(url('/api/customers', query))

  expect(response.status).toBe(200)

  return listCustomersResponseSchema.parse(await response.json())
}

async function expectError(response: Response, status: number, code: string): Promise<string[]> {
  expect(response.status).toBe(status)

  const body = apiErrorSchema.parse(await response.json())
  expect(body.error.code).toBe(code)

  return body.error.details ?? []
}

describe('GET /api/customers', () => {
  it('serves the first page of the list, newest signup first', async () => {
    const body = await listCustomers(createApp())

    expect(body.rows).toHaveLength(20)
    // The whole list the filters match, not the part served so far: a page of
    // twenty out of sixty still has to be able to say "of 60".
    expect(body.total).toBe(CUSTOMER_COUNT)
    expect(body.nextCursor).not.toBeNull()

    const signupDates = body.rows.map((customer) => customer.signupDate)
    expect([...signupDates].sort().reverse()).toEqual(signupDates)
  })

  it('walks the whole list on the cursor without repeating or skipping a row', async () => {
    const app = createApp()
    const seen: string[] = []

    let cursor: string | null = null
    let requests = 0

    do {
      const page: ListCustomersResponse = await listCustomers(app, {
        limit: '7',
        ...(cursor === null ? {} : { cursor }),
      })

      seen.push(...page.rows.map((customer) => customer.id))
      cursor = page.nextCursor
      requests += 1
    } while (cursor !== null && requests < 20)

    expect(seen).toHaveLength(CUSTOMER_COUNT)
    expect(new Set(seen).size).toBe(CUSTOMER_COUNT)
    // Sixty rows, seven at a time: nine pages, and the ninth ends the list.
    expect(requests).toBe(9)
  })

  it('stops offering a cursor once the last row has been served', async () => {
    const body = await listCustomers(createApp(), { limit: '100' })

    expect(body.rows).toHaveLength(CUSTOMER_COUNT)
    expect(body.nextCursor).toBeNull()
  })

  it('filters on several plans at once', async () => {
    const app = createApp()

    const enterprise = await listCustomers(app, { plans: 'enterprise', limit: '100' })
    expect(enterprise.rows.every((customer) => customer.plan === 'enterprise')).toBe(true)
    expect(enterprise.total).toBe(5)

    const pro = await listCustomers(app, { plans: 'pro', limit: '100' })
    expect(pro.total).toBe(9)

    // A set filter, not a widened single value: two plans is the union of both.
    const both = await listCustomers(app, { plans: 'pro,enterprise', limit: '100' })
    expect(both.total).toBe(enterprise.total + pro.total)
    expect(both.rows.every((customer) => customer.plan !== 'free')).toBe(true)

    // The empty set is not a filter at all, which is why there is no `all`.
    expect((await listCustomers(app, { plans: '', limit: '100' })).total).toBe(CUSTOMER_COUNT)
  })

  it('searches over name, company and email', async () => {
    const app = createApp()

    const byName = await listCustomers(app, { search: 'priya' })
    expect(byName.rows.map((customer) => customer.name)).toEqual(['Priya Raman'])

    const byCompany = await listCustomers(app, { search: 'Northwind', limit: '100' })
    expect(byCompany.total).toBe(3)
    expect(byCompany.rows.every((customer) => customer.company === 'Northwind Labs')).toBe(true)

    const byEmail = await listCustomers(app, { search: 'priya.raman@' })
    expect(byEmail.rows.map((customer) => customer.id)).toEqual([BUSY_CUSTOMER_ID])

    expect((await listCustomers(app, { search: 'zzzzzz' })).total).toBe(0)
  })

  it('reads the cursor as a place in the filtered list', async () => {
    const app = createApp()

    const firstPage = await listCustomers(app, { plans: 'starter', limit: '4' })
    const secondPage = await listCustomers(app, {
      plans: 'starter',
      limit: '4',
      cursor: firstPage.nextCursor ?? '',
    })

    expect(secondPage.rows.every((customer) => customer.plan === 'starter')).toBe(true)
    // The cursor names a position, so the filter still holds on the far side of
    // it rather than the second page reverting to the unfiltered list.
    expect(secondPage.total).toBe(firstPage.total)

    const firstPageIds = firstPage.rows.map((customer) => customer.id)
    expect(secondPage.rows.some((customer) => firstPageIds.includes(customer.id))).toBe(false)
  })

  it('rejects a query string it cannot make sense of', async () => {
    const details = await expectError(
      await createApp().request('/api/customers?plans=gold&cursor=42&limit=0'),
      400,
      'validation_failed',
    )

    expect(details).toHaveLength(3)
    expect(details.join('\n')).toContain('plans.0:')
    expect(details.join('\n')).toContain('cursor: Must be a cursor this endpoint issued.')
  })
})

describe('GET /api/customers/:id', () => {
  it('returns one customer with the tickets they raised, newest first', async () => {
    const response = await createApp().request(`/api/customers/${BUSY_CUSTOMER_ID}`)

    expect(response.status).toBe(200)

    const customer = customerSchema.parse(await response.json())

    expect(customer).toMatchObject({
      id: BUSY_CUSTOMER_ID,
      name: 'Priya Raman',
      company: 'Northwind Labs',
      ticketCount: 8,
    })
    expect(customer.tickets).toHaveLength(customer.ticketCount)

    const createdAt = customer.tickets.map((ticket) => Date.parse(ticket.createdAt))
    expect([...createdAt].sort((a, b) => b - a)).toEqual(createdAt)
  })

  it('has nothing to show for a customer who has never raised anything', async () => {
    const response = await createApp().request('/api/customers/CUS-0002')
    const customer = customerSchema.parse(await response.json())

    expect(customer.ticketCount).toBe(0)
    expect(customer.tickets).toEqual([])
  })

  it('is a 404 for a customer that does not exist', async () => {
    await expectError(await createApp().request('/api/customers/CUS-9999'), 404, 'not_found')
  })
})

describe('customers and the queue', () => {
  /**
   * The link is read through the ticket store on every request rather than
   * copied at seed time, so a ticket that leaves the queue leaves the customer
   * who raised it in the same breath — in the count on the row as well as in the
   * list in the drawer.
   */
  it('drops a deleted ticket from the customer who raised it', async () => {
    const app = createApp()

    const before = customerSchema.parse(
      await (await app.request(`/api/customers/${BUSY_CUSTOMER_ID}`)).json(),
    )
    const [removed] = before.tickets

    expect(removed).toBeDefined()
    expect((await app.request(`/api/tickets/${removed?.id ?? ''}`, { method: 'DELETE' })).status)
      .toBe(200)

    const after = customerSchema.parse(
      await (await app.request(`/api/customers/${BUSY_CUSTOMER_ID}`)).json(),
    )

    expect(after.ticketCount).toBe(before.ticketCount - 1)
    expect(after.tickets.map((ticket) => ticket.id)).not.toContain(removed?.id)

    const row = (await listCustomers(app, { search: 'priya' })).rows[0]
    expect(row?.ticketCount).toBe(before.ticketCount - 1)
  })

  it('reports a status changed on the ticket screens', async () => {
    const app = createApp()
    const ticketId = 'TCK-0001'

    await app.request(`/api/tickets/${ticketId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'closed' }),
    })

    const customer = customerSchema.parse(
      await (await app.request(`/api/customers/${BUSY_CUSTOMER_ID}`)).json(),
    )

    expect(customer.tickets.find((ticket) => ticket.id === ticketId)?.status).toBe('closed')
  })
})

/**
 * The two bulk routes, which are the only writes the customer store has.
 *
 * Each case builds its own app, and so its own customer store: these mutate, and
 * a store shared between cases would make the order they run in part of what is
 * being asserted.
 */
async function bulk(
  app: ReturnType<typeof createApp>,
  method: 'PATCH' | 'DELETE',
  body: unknown,
): Promise<Response> {
  return app.request('/api/customers/bulk', {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PATCH /api/customers/bulk', () => {
  it('moves every customer named onto the plan, and nobody else', async () => {
    const app = createApp()
    const ids = ['CUS-0002', 'CUS-0003']

    /** Everyone the request did not name, and the plan they are on. */
    function untouched(rows: ListCustomersResponse['rows']): string[] {
      return rows
        .filter((customer) => !ids.includes(customer.id))
        .map((customer) => `${customer.id}:${customer.plan}`)
    }

    const before = await listCustomers(app, { limit: '100' })
    const response = await bulk(app, 'PATCH', { ids, plan: 'enterprise' })

    expect(response.status).toBe(200)
    expect(updatedCountSchema.parse(await response.json())).toEqual({ updated: 2 })

    const after = await listCustomers(app, { limit: '100' })

    expect(
      after.rows.filter((customer) => ids.includes(customer.id)).map((customer) => customer.plan),
    ).toEqual(['enterprise', 'enterprise'])
    // Asserted against the other fifty-eight rather than against a count, so a
    // write that reached past the ids it was given fails here whichever way it
    // went — and whatever the seed happens to put these two on today.
    expect(untouched(after.rows)).toEqual(untouched(before.rows))
  })

  it('counts what it changed rather than what it was asked to change', async () => {
    const response = await bulk(createApp(), 'PATCH', {
      ids: ['CUS-0002', 'CUS-9999'],
      plan: 'pro',
    })

    // An id that names nobody is not an error — a row can be deleted between a
    // list being drawn and a selection made from it being sent.
    expect(updatedCountSchema.parse(await response.json())).toEqual({ updated: 1 })
  })

  it('rejects a body it cannot make sense of', async () => {
    const app = createApp()

    await expectError(await bulk(app, 'PATCH', { ids: [], plan: 'pro' }), 400, 'validation_failed')
    await expectError(
      await bulk(app, 'PATCH', { ids: ['CUS-0001'], plan: 'platinum' }),
      400,
      'validation_failed',
    )
    // A `bulk` that reached the `:id` route would be a 404 for a customer of
    // that name, which is the failure the route order exists to prevent.
    await expectError(await bulk(app, 'PATCH', 'not json at all'), 400, 'validation_failed')
  })
})

describe('DELETE /api/customers/bulk', () => {
  it('removes every customer named and shortens the list by that many', async () => {
    const app = createApp()

    const response = await bulk(app, 'DELETE', { ids: ['CUS-0002', 'CUS-0003'] })

    expect(response.status).toBe(200)
    expect(deletedCountSchema.parse(await response.json())).toEqual({ deleted: 2 })

    expect((await listCustomers(app, { limit: '100' })).total).toBe(CUSTOMER_COUNT - 2)
    await expectError(await app.request('/api/customers/CUS-0002'), 404, 'not_found')
  })

  it('leaves the queue alone', async () => {
    const app = createApp()
    const before = customerSchema.parse(
      await (await app.request(`/api/customers/${BUSY_CUSTOMER_ID}`)).json(),
    )

    await bulk(app, 'DELETE', { ids: [BUSY_CUSTOMER_ID] })

    // The link runs from a customer to ticket ids and not back, so deleting the
    // customer takes the link and leaves the support history.
    for (const ticket of before.tickets) {
      expect((await app.request(`/api/tickets/${ticket.id}`)).status).toBe(200)
    }
  })

  it('rejects a body it cannot make sense of', async () => {
    await expectError(await bulk(createApp(), 'DELETE', { ids: [] }), 400, 'validation_failed')
  })
})
