import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { MeResponse } from '@harness-sample/shared'
import { getMe } from '@/lib/api/session'
import { sessionKeys } from './sessionKeys'

interface UseMeOptions {
  enabled?: boolean
}

/** Who the API says is signed in. */
export function useMe({ enabled = true }: UseMeOptions = {}): UseQueryResult<MeResponse, Error> {
  return useQuery({
    queryKey: sessionKeys.me(),
    queryFn: ({ signal }) => getMe(signal),
    enabled,
  })
}
