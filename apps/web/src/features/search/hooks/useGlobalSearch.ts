import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query'
import { DEFAULT_SEARCH_LIMIT, type SearchResponse } from '@support-desk/shared'
import { search } from '@/lib/api/search'
import { searchKeys } from '../searchKeys'

/**
 * What the server finds for a term.
 *
 * The term handed in is already debounced — see `GlobalSearch` — so this is one
 * request per pause in typing rather than one per keystroke, and the cache key
 * is built from the settled term for the same reason.
 *
 * `keepPreviousData` is what makes the panel stop flickering. Without it every
 * new term empties the list before it fills it, and a palette that blanks
 * between keystrokes is one nobody can read while typing. `isPending` is
 * therefore true only before the very first answer; what the screen watches
 * after that is whether it already has something to show.
 *
 * Disabled while the palette is closed and while the term is empty. Nothing
 * matches nothing, and the answer to "before anything is typed" is not a
 * request.
 */
export function useGlobalSearch(
  term: string,
  isOpen: boolean,
): UseQueryResult<SearchResponse, Error> {
  const query = { q: term, limit: DEFAULT_SEARCH_LIMIT }

  return useQuery({
    queryKey: searchKeys.query(query),
    queryFn: ({ signal }) => search(query, signal),
    enabled: isOpen && term !== '',
    placeholderData: keepPreviousData,
  })
}
