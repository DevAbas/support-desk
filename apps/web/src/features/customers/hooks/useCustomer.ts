import { skipToken, useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { Customer } from '@support-desk/shared'
import { getCustomer } from '@/lib/api/customers'
import { customerKeys } from '@/features/customers/customerKeys'

/**
 * One customer and the tickets they have raised.
 *
 * The id is null while the drawer is closed, and `skipToken` holds the query
 * back in that case without widening the id inside the query function to
 * something that has to be asserted away — the same trick `useTicket` uses for
 * an id that has not arrived from the route yet.
 *
 * The list does not carry this. A row knows how many tickets a customer has, not
 * what they are, so opening the drawer is a real request rather than a lookup in
 * data already held.
 */
export function useCustomer(id: string | null): UseQueryResult<Customer, Error> {
  return useQuery({
    // Unused while the query is held back: nothing is read or written under it.
    queryKey: customerKeys.detail(id ?? ''),
    queryFn: id === null ? skipToken : ({ signal }) => getCustomer(id, signal),
  })
}
