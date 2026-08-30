import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { MeResponse } from '@harness-sample/shared'
import { getMe } from '@/lib/api/session'
import { sessionKeys } from './sessionKeys'

interface UseSessionOptions {
  enabled?: boolean
}

/**
 * Who the API says is signed in.
 *
 * The query failing is not an error state any screen renders: a 401 is how the
 * server says "nobody", and `RequireSession` reads that as a redirect. So
 * callers want `isPending` and `isSuccess` here rather than `isError` — the
 * question is which of three answers came back, not whether something broke.
 */
export function useSession({ enabled = true }: UseSessionOptions = {}): UseQueryResult<
  MeResponse,
  Error
> {
  return useQuery({
    queryKey: sessionKeys.me(),
    queryFn: ({ signal }) => getMe(signal),
    enabled,
  })
}
