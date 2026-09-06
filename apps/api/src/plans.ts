import type { Hono } from 'hono'
import {
  customerPlanSchema,
  updateCustomerPlanBodySchema,
  type CustomerPlan,
  type CustomerPlanRow,
  type CustomerPlanTerms,
} from '@support-desk/shared'
import { requireAdmin } from './auth'
import type { CustomerStore } from './customerStore'
import type { PlanStore } from './planStore'
import { fail, invalid, missing, readJsonBody, type AppEnv } from './respond'

/**
 * The plan catalogue: what each plan costs, what it carries, and who is on it.
 *
 * Its own module rather than two more routes in `app.ts`, for the reason
 * `search.ts` and `moves.ts` are: `createApiApp` is one function against a line
 * ceiling it is already close to, and this is a read that spans two stores —
 * the terms are the plan store's, the counts are the customer store's — rather
 * than a route over one of them.
 *
 * **Both routes are administrators' work**, and refused here rather than merely
 * absent from the nav. A price list is what the business charges, not a view of
 * the queue; an agent working tickets has no reason to see it and no business
 * changing it. The nav, the route guard and the global search all read the same
 * `roles` on `NAVIGATION_TARGETS`, and this is the half a client cannot talk its
 * way past — the same arrangement the reporting endpoints have.
 *
 * **There is no create and no delete**, because the set of plans is a closed
 * union in the shared contract and not a collection. See `plans.ts` there.
 */

export interface PlanRouteStores {
  plans: PlanStore
  customers: CustomerStore
}

/**
 * The terms with the count beside them.
 *
 * The counts are taken once per request and handed to every row, rather than
 * each row asking: counting sixty customers four times to answer one request is
 * the same defect `ticketsById` exists to avoid in the customer store.
 */
function toRow(terms: CustomerPlanTerms, counts: Record<CustomerPlan, number>): CustomerPlanRow {
  return { ...terms, customerCount: counts[terms.plan] }
}

export function registerPlanRoutes(app: Hono<AppEnv>, { plans, customers }: PlanRouteStores): void {
  const adminOnly = requireAdmin()

  app.get('/api/plans', adminOnly, (c) => {
    const counts = customers.countByPlan()

    return c.json({ rows: plans.list().map((terms) => toRow(terms, counts)) })
  })

  app.patch('/api/plans/:plan', adminOnly, async (c) => {
    const id = c.req.param('plan')
    const plan = customerPlanSchema.safeParse(id)

    // A plan that is not one of the four is a 404 rather than a 400: the plan is
    // the address here, and an address that names nothing is missing, not
    // malformed. It is also the answer that does not tell a stranger which
    // spellings exist — though nobody unauthenticated gets this far.
    if (!plan.success) {
      return missing(c, 'Plan', id)
    }

    const raw = await readJsonBody(c)

    if (!raw.ok) {
      return fail(c, 400, 'validation_failed', 'The request body is not valid JSON.')
    }

    const body = updateCustomerPlanBodySchema.safeParse(raw.value)

    if (!body.success) {
      return invalid(c, body.error, 'plan')
    }

    const result = plans.update(plan.data, body.data)

    // A 409 rather than a 400, and the difference is worth keeping: the body is
    // a perfectly valid set of terms, and what refuses it is the state of the
    // other three plans. The message is the rule's own `requirement`, so the
    // sentence a person reads names the pair that is out of order rather than
    // saying the edit was rejected.
    if (!result.ok) {
      return fail(c, 409, 'conflict', result.issue.requirement)
    }

    return c.json(toRow(result.terms, customers.countByPlan()))
  })
}
