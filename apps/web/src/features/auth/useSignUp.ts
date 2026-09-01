import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'
import type { MeResponse, RegisterBody } from '@support-desk/shared'
import { signUp } from '@/lib/api/session'
import { replaceSession } from './sessionCache'

/** Registering signs you in, so it leaves the cache the way `useSignIn` does. */
export function useSignUp(): UseMutationResult<MeResponse, Error, RegisterBody> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: signUp,
    onSuccess: (session) => {
      replaceSession(queryClient, session)
    },
  })
}
