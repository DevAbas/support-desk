import { QueryClient } from '@tanstack/react-query'
import { isClientError } from './http'

/**
 * The cache defaults for the whole app.
 *
 * Data is held for half a minute before it is considered stale, which is long
 * enough that moving between the list and a ticket does not refetch, and short
 * enough that a queue worked on in another tab is not badly out of date.
 */
const MAX_RETRIES = 2

const STALE_TIME_MS = 30_000

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_MS,
        // A 404 or a rejected filter is not going to succeed on a second
        // attempt; only a lost connection or a broken server is worth retrying.
        retry: (failureCount, error) => !isClientError(error) && failureCount < MAX_RETRIES,
        refetchOnWindowFocus: false,
      },
      // Nothing here is safe to replay on its own: a retried bulk delete would
      // be a second bulk delete.
      mutations: { retry: false },
    },
  })
}
