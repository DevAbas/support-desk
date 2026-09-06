import {
  customerPlanRowSchema,
  listCustomerPlansResponseSchema,
  updateCustomerPlanBodySchema,
  type CustomerPlan,
  type CustomerPlanRow,
  type ListCustomerPlansResponse,
  type UpdateCustomerPlanBody,
} from '@support-desk/shared'
import { apiRequest } from './http'

/**
 * One function per plan endpoint, in the same shape as `customers.ts`: these
 * know about HTTP and nothing about React.
 *
 * There is no query string on the listing and no paging around it. The set of
 * plans is a closed union, so "every plan" is the only question this endpoint
 * has, and inventing a filter for four rows would be a parameter nothing sends.
 */

export function listCustomerPlans(signal?: AbortSignal): Promise<ListCustomerPlansResponse> {
  return apiRequest('/plans', { schema: listCustomerPlansResponseSchema, signal })
}

/**
 * The plan is in the path and the terms are the body, because the plan is what
 * is being addressed rather than a value being written.
 *
 * The body is parsed on the way out as well as on the way in, the way the
 * customer bulk operations are, so terms the contract will not accept — a
 * negative price, a blank description — name the field here instead of arriving
 * as a round trip and a 400. What it cannot catch is the ladder: whether a price
 * sits correctly against the plan above it is a fact about the other three
 * plans, and the server is the only end holding all four.
 */
export function updateCustomerPlan(
  plan: CustomerPlan,
  body: UpdateCustomerPlanBody,
): Promise<CustomerPlanRow> {
  return apiRequest(`/plans/${encodeURIComponent(plan)}`, {
    method: 'PATCH',
    body: updateCustomerPlanBodySchema.parse(body),
    schema: customerPlanRowSchema,
  })
}
