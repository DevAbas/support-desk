import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import type { LoginBody, MeResponse } from '@support-desk/shared'
import { signIn } from '@/lib/api/session'
import { replaceSession } from './sessionCache'

/**
 * Signing in writes the session straight into the cache rather than
 * invalidating it, so the screen the user lands on already knows who they are
 * and does not flash its loading state on the way in — the answer arrived with
 * the response that signed them in.
 *
 * Everything else is cleared. Whatever the cache holds was fetched as somebody
 * else, or as nobody.
 */
export function useSignIn(): UseMutationResult<MeResponse, Error, LoginBody> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: signIn,
    onSuccess: (session) => {
      replaceSession(queryClient, session)
    },
  })
}
