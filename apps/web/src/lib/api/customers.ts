import {
  bulkDeleteCustomersBodySchema,
  bulkUpdateCustomerPlanBodySchema,
  customerSchema,
  deletedCountSchema,
  listCustomersQuerySchema,
  listCustomersResponseSchema,
  updatedCountSchema,
  type BulkDeleteCustomersBody,
  type BulkUpdateCustomerPlanBody,
  type Customer,
  type DeletedCount,
  type ListCustomersQuery,
  type ListCustomersResponse,
  type UpdatedCount,
} from '@harness-sample/shared'
import { apiRequest, type QueryParams } from './http'

/**
 * One function per endpoint, in the same shape as `tickets.ts`: these know about
 * HTTP and nothing about React.
 *
 * The list is a cursor rather than a page number, so `listCustomers` is called
 * once per page with the cursor the last one handed back. Which page that is is
 * TanStack Query's business, not this file's — see `hooks/useCustomers.ts`.
 */

/**
 * A parsed query as a query string.
 *
 * Two fields are left out rather than sent empty. A plan filter of nothing is
 * the empty set, not `plans=`, and there is no cursor at all for the first page
 * — the contract validates the shape of one, so a placeholder would have to be
 * a shape it made an exception for.
 */
function toQueryParams({ plans, search, cursor, limit }: ListCustomersQuery): QueryParams {
  const params: Record<string, string | number> = { search, limit }

  if (plans.length > 0) {
    params.plans = plans.join(',')
  }

  if (cursor !== undefined) {
    params.cursor = cursor
  }

  return params
}

export function listCustomers(
  query: ListCustomersQuery,
  signal?: AbortSignal,
): Promise<ListCustomersResponse> {
  return apiRequest('/customers', {
    schema: listCustomersResponseSchema,
    query: toQueryParams(listCustomersQuerySchema.parse(query)),
    signal,
  })
}

export function getCustomer(id: string, signal?: AbortSignal): Promise<Customer> {
  return apiRequest(`/customers/${encodeURIComponent(id)}`, { schema: customerSchema, signal })
}

/**
 * The two bulk operations, both on `/customers/bulk` and separated by method,
 * the way the ticket ones are. Bodies are parsed on the way out as well as on
 * the way in, so a selection the contract will not accept — an empty one, or one
 * longer than `MAX_CUSTOMER_BULK_IDS` — names the field here instead of arriving
 * as a round trip and a 400.
 */
export function bulkUpdateCustomerPlan(body: BulkUpdateCustomerPlanBody): Promise<UpdatedCount> {
  return apiRequest('/customers/bulk', {
    method: 'PATCH',
    body: bulkUpdateCustomerPlanBodySchema.parse(body),
    schema: updatedCountSchema,
  })
}

export function bulkDeleteCustomers(body: BulkDeleteCustomersBody): Promise<DeletedCount> {
  return apiRequest('/customers/bulk', {
    method: 'DELETE',
    body: bulkDeleteCustomersBodySchema.parse(body),
    schema: deletedCountSchema,
  })
}
