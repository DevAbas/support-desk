import { describe, expect, it } from 'vitest'
import {
  apiErrorSchema,
  customerPlanRowSchema,
  listCustomerPlansResponseSchema,
  listCustomersResponseSchema,
  CUSTOMER_PLANS,
  type CustomerPlanRow,
  type ListCustomerPlansResponse,
} from '@support-desk/shared'
import { createApp } from './test/support'
import { SEED_AGENT_EMAIL } from './userSeed'

/**
 * The plan catalogue endpoints, exercised the same way as the customer routes:
 * through `app.request`, with every response parsed by the contract schema
 * rather than poked at, and signed in as the admin — see `test/support`.
 *
 * Each case that writes builds its own app, and so its own plan store, because
 * a plan re-priced by one case would still be re-priced in the next and the
 * order they run in would become part of what is asserted.
 *
 * The counts below are fixed properties of the customer seed — sixty accounts,
 * weighted towards the cheap end — and not figures read back off the code under
 * test.
 */
const CUSTOMER_COUNT = 60

async function listPlans(
  app: ReturnType<typeof createApp>,
): Promise<ListCustomerPlansResponse['rows']> {
  const response = await app.request('/api/plans')

  expect(response.status).toBe(200)

  return listCustomerPlansResponseSchema.parse(await response.json()).rows
}

/** The whole of an edit, since the body is not a patch. */
function termsOf({ monthlyPricePence, seatLimit, description }: CustomerPlanRow) {
  return { monthlyPricePence, seatLimit, description }
}

async function editPlan(
  app: ReturnType<typeof createApp>,
  plan: string,
  body: unknown,
): Promise<Response> {
  return app.request(`/api/plans/${plan}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function expectError(response: Response, status: number, code: string): Promise<string> {
  expect(response.status).toBe(status)

  const body = apiErrorSchema.parse(await response.json())
  expect(body.error.code).toBe(code)

  return body.error.message
}

/** A plan out of a listing, by name, so a case reads as what it is about. */
function row(rows: readonly CustomerPlanRow[], plan: string): CustomerPlanRow {
  const found = rows.find((candidate) => candidate.plan === plan)

  expect(found).toBeDefined()

  return found as CustomerPlanRow
}

describe('GET /api/plans', () => {
  it('serves every plan, in domain order, with no paging', async () => {
    const rows = await listPlans(createApp())

    // The set is a closed union, so the response is the whole of it: there is no
    // cursor to walk and no page to ask for.
    expect(rows.map((plan) => plan.plan)).toEqual([...CUSTOMER_PLANS])
  })

  it('counts the customers on each plan, and accounts for all of them', async () => {
    const rows = await listPlans(createApp())

    expect(row(rows, 'enterprise').customerCount).toBe(5)
    expect(row(rows, 'pro').customerCount).toBe(9)
    // Every customer is on exactly one plan, so the four counts are the list.
    expect(rows.reduce((total, plan) => total + plan.customerCount, 0)).toBe(CUSTOMER_COUNT)
  })

  it('follows a customer moved onto another plan', async () => {
    const app = createApp()
    const before = await listPlans(app)

    // Read off the list rather than named, so the case moves two customers that
    // are genuinely somewhere else today: hard-coded ids would quietly assert
    // nothing the day the seed happens to put one of them on Enterprise already.
    const free = listCustomersResponseSchema.parse(
      await (await app.request('/api/customers?plans=free&limit=2')).json(),
    )

    expect(free.rows).toHaveLength(2)

    await app.request('/api/customers/bulk', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ids: free.rows.map((customer) => customer.id),
        plan: 'enterprise',
      }),
    })

    const after = await listPlans(app)

    // Counted through the customer store on every request rather than kept
    // beside the terms, so a bulk plan change on the customer screen is visible
    // here without anything having to be told about it.
    expect(row(after, 'enterprise').customerCount).toBe(row(before, 'enterprise').customerCount + 2)
    expect(after.reduce((total, plan) => total + plan.customerCount, 0)).toBe(CUSTOMER_COUNT)
  })
})

describe('PATCH /api/plans/:plan', () => {
  it('re-prices one plan and leaves the rest of the catalogue alone', async () => {
    const app = createApp()
    const before = await listPlans(app)

    const response = await editPlan(app, 'pro', {
      ...termsOf(row(before, 'pro')),
      monthlyPricePence: 5_900,
      seatLimit: 60,
      description: 'Reporting, bulk actions and sixty seats.',
    })

    expect(response.status).toBe(200)

    const updated = customerPlanRowSchema.parse(await response.json())
    expect(updated.monthlyPricePence).toBe(5_900)
    // The count comes back with it, so the row the screen already has is the row
    // it can put straight back on the table.
    expect(updated.customerCount).toBe(row(before, 'pro').customerCount)

    const after = await listPlans(app)
    expect(row(after, 'pro')).toEqual(updated)
    expect(after.filter((plan) => plan.plan !== 'pro')).toEqual(
      before.filter((plan) => plan.plan !== 'pro'),
    )
  })

  it('takes a seat limit off a plan entirely', async () => {
    const app = createApp()
    const before = row(await listPlans(app), 'pro')

    const response = await editPlan(app, 'pro', { ...termsOf(before), seatLimit: null })

    expect(response.status).toBe(200)
    expect(customerPlanRowSchema.parse(await response.json()).seatLimit).toBeNull()
  })

  it('refuses an edit that breaks the price ladder, and says which pair', async () => {
    const app = createApp()
    const before = await listPlans(app)

    // A 409 rather than a 400: the body is a perfectly valid set of terms, and
    // what refuses it is the state of the other three plans.
    const message = await expectError(
      await editPlan(app, 'pro', { ...termsOf(row(before, 'pro')), monthlyPricePence: 100 }),
      409,
      'conflict',
    )

    expect(message).toContain('Starter')
    expect(message).toContain('Pro')

    // And nothing was written: the store checks the catalogue an edit would
    // produce rather than applying one and undoing it.
    expect(await listPlans(app)).toEqual(before)
  })

  it('refuses an edit that breaks the seat ladder', async () => {
    const app = createApp()
    const before = row(await listPlans(app), 'starter')

    const message = await expectError(
      await editPlan(app, 'starter', { ...termsOf(before), seatLimit: 1 }),
      409,
      'conflict',
    )

    expect(message).toContain('seats')
  })

  it('rejects a body it cannot make sense of', async () => {
    const app = createApp()
    const pro = termsOf(row(await listPlans(app), 'pro'))

    await expectError(
      await editPlan(app, 'pro', { ...pro, monthlyPricePence: -1 }),
      400,
      'validation_failed',
    )
    await expectError(await editPlan(app, 'pro', { ...pro, description: '' }), 400, 'validation_failed')
    // Not a patch: the form shows every field, so a body carrying one of them
    // describes a request the screen has no way to make.
    await expectError(await editPlan(app, 'pro', { monthlyPricePence: 4_900 }), 400, 'validation_failed')
    await expectError(await editPlan(app, 'pro', 'not json at all'), 400, 'validation_failed')
  })

  it('answers 404 for a plan that is not one of the four', async () => {
    // The plan is the address here, so a name that is not a plan is missing
    // rather than malformed.
    await expectError(await editPlan(createApp(), 'platinum', {}), 404, 'not_found')
  })
})

describe('who may reach the catalogue', () => {
  it('refuses an agent both routes', async () => {
    const app = createApp({}, SEED_AGENT_EMAIL)

    // Not a destructive route and still administrators' work: a price list is
    // what the business charges rather than a view of the queue. The nav, the
    // route guard and the global search all read the same `roles` on
    // `NAVIGATION_TARGETS`; this is the half a client cannot talk its way past.
    await expectError(await app.request('/api/plans'), 403, 'forbidden')
    await expectError(await editPlan(app, 'pro', {}), 403, 'forbidden')
  })
})
