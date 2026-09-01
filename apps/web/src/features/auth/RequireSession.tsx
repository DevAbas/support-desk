import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { StateMessage } from '@support-desk/ui'
import { useSession } from './useSession'
import { toLoginPath } from './nextPath'

/**
 * A string literal rather than JSX text, which is the escape hatch
 * `harness/no-glyph-icons` names: the ellipsis here is genuinely part of a
 * sentence, not a glyph standing in for an icon.
 */
const CHECKING_MESSAGE = 'Checking your session…'

/**
 * The gate every route inside the app shell sits behind.
 *
 * It reads the query's three states rather than the role, which is the whole
 * reason it exists: a signed-out visitor and one whose session has not come back
 * yet both have no role, and sending the second to the login page would mean the
 * app redirected itself on every reload.
 */
export function RequireSession() {
  const session = useSession()
  const location = useLocation()

  if (session.isPending) {
    return <StateMessage isLoading>{CHECKING_MESSAGE}</StateMessage>
  }

  if (!session.isSuccess) {
    return <Navigate to={toLoginPath(`${location.pathname}${location.search}`)} replace />
  }

  return <Outlet />
}
