import {
  keepPreviousData,
  useInfiniteQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
} from '@tanstack/react-query'
import type { ListCustomersFilters, ListCustomersResponse } from '@support-desk/shared'
import { listCustomers } from '@/lib/api/customers'
import { customerKeys } from '@/features/customers/customerKeys'

/**
 * The customer list, a page at a time, all of it under one cache entry.
 *
 * This is `useInfiniteQuery` rather than `useQuery` because the list grows
 * rather than moves: asking for more appends to what is already on screen
 * instead of replacing it, which is the whole difference between a load-more
 * list and the paginated ticket table. Query holds the pages; the screen reads
 * them as one array.
 *
 * The cursor is the page param, and it comes back from the server rather than
 * being counted up here — `getNextPageParam` returning `undefined` is what tells
 * Query there is no more to ask for, and so what turns the load-more button off.
 *
 * The previous list is kept on screen while a new filter loads, the same way the
 * ticket table keeps the previous page. `isPending` is therefore true only on
 * the very first load; `isFetching` is what to disable controls on.
 */
export function useCustomers(
  filters: ListCustomersFilters,
): UseInfiniteQueryResult<InfiniteData<ListCustomersResponse>, Error> {
  return useInfiniteQuery({
    queryKey: customerKeys.list(filters),
    queryFn: ({ pageParam, signal }) => listCustomers({ ...filters, cursor: pageParam }, signal),
    // The first page has no cursor, which is a real absence rather than a
    // sentinel: the contract has no shape of cursor that means "the start".
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
  })
}
