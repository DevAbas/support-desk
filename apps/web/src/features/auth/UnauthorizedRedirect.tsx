import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { setUnauthorizedHandler } from '@/lib/api/http'
import { toLoginPath } from './nextPath'
import { forgetSession } from './sessionCache'

/**
 * Turns a 401 from anywhere into a trip to the login page.
 *
 * It renders nothing and exists to hold a `useNavigate`: the fetch wrapper is
 * where every response is seen and is not a component, so the two are joined by
 * a handler registered here for as long as the app is mounted.
 *
 * The cache goes the way it goes on a deliberate sign-out, and for the same
 * reason: everything in it was fetched as a user who is no longer there.
 *
 * `window.location` rather than `useLocation`, deliberately. This runs once, and
 * subscribing to the location would re-register the handler on every navigation
 * to keep a value that is only read at the moment the 401 arrives — by which
 * time `window.location` is the same answer and always current.
 */
export function UnauthorizedRedirect() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    setUnauthorizedHandler(() => {
      forgetSession(queryClient)
      navigate(toLoginPath(`${window.location.pathname}${window.location.search}`), {
        replace: true,
      })
    })

    return () => {
      setUnauthorizedHandler(null)
    }
  }, [navigate, queryClient])

  return null
}
