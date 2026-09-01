import { Navigate, Outlet } from 'react-router-dom'
import { canReachNavigationTarget, type NavigationTargetId } from '@support-desk/shared'
import { useRole } from './useRole'

interface RequireRoleProps {
  /** The screen behind this gate, named out of the shared table. */
  target: NavigationTargetId
}

/**
 * The gate for a screen not every role may reach.
 *
 * It asks the same question the header nav asks and the search asks —
 * `canReachNavigationTarget` — rather than testing a role here, so "an agent
 * cannot reach the reports" is one answer with three readers instead of three
 * implementations of one rule. A screen gated in `NAVIGATION_TARGETS` is gated
 * everywhere at once.
 * Narrowing `tickets` needs a redirect target that is not the queue.
 *
 * It sits inside `RequireSession`, which is what makes reading the role safe: a
 * session that has not come back yet has no role, and this would send an
 * administrator away from a screen they may in fact have. The outer guard holds
 * the shell back until that question is answered.
 *
 * A redirect rather than a message. There is nothing to be done about a screen
 * that is not yours, and this is only reachable by typing the URL — the nav does
 * not offer it and neither does the search. The queue is where everyone belongs.
 */
export function RequireRole({ target }: RequireRoleProps) {
  const { role } = useRole()

  return canReachNavigationTarget(role, target) ? <Outlet /> : <Navigate to="/tickets" replace />
}
