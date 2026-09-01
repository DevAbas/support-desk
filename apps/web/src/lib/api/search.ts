import {
  searchQuerySchema,
  searchResponseSchema,
  type SearchQuery,
  type SearchResponse,
} from '@support-desk/shared'
import { apiRequest } from './http'

/**
 * One endpoint for the whole search, in the same shape as `tickets.ts` and
 * `customers.ts`: it knows about HTTP and nothing about React.
 *
 * There is one function here because there is one request. The alternative — a
 * call to the ticket list and one to the customer list, interleaved on arrival —
 * is what the shared contract's docblock argues against, and it would put the
 * group order and the role gate in this layer.
 */
export function search(query: SearchQuery, signal?: AbortSignal): Promise<SearchResponse> {
  return apiRequest('/search', {
    schema: searchResponseSchema,
    query: searchQuerySchema.parse(query),
    signal,
  })
}
