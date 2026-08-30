import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import { signOut } from '@/lib/api/session'
import { forgetSession } from './sessionCache'

/**
 * Signing out empties the cache rather than invalidating it.
 *
 * Invalidating would leave every answer in place and refetch it, which is a
 * burst of requests the session no longer authorises and, for as long as they
 * are in flight, the previous user's queue still on the screen. `forgetSession`
 * throws all of it away and asks one question instead — who, if anyone, is
 * signed in now.
 */
export function useSignOut(): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: signOut,
    onSettled: () => {
      forgetSession(queryClient)
    },
  })
}
