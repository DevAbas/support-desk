import type { QueryClient } from '@tanstack/react-query'
import type { MeResponse } from '@harness-sample/shared'
import { sessionKeys } from './sessionKeys'

const [SESSION_SCOPE] = sessionKeys.all()

/**
 * What happens to the cache when the person using it changes.
 *
 * Everything in it was fetched as somebody else and none of it survives — except
 * the session query, which is not "something the cache holds" but the answer
 * these functions are about, and the one query that has to keep its identity.
 *
 * `queryClient.clear()` did not keep it, and that was the defect. Removing a
 * query destroys the `Query` object, and a mounted `useSession` is subscribed to
 * that object rather than to the key: the `setQueryData` that came after built a
 * *new* query under the same key, holding the right session, with nothing
 * watching it. Nothing corrected it afterwards either, because `RoleProvider`
 * sits above the router in `App.tsx` — navigating re-renders everything below it
 * and not the provider itself, so the header kept whichever role it had last
 * rendered until the page was reloaded.
 */
function removeEverythingElse(queryClient: QueryClient): void {
  queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== SESSION_SCOPE })
}

/**
 * Signing in and registering both answer with the session they just created, so
 * it is written straight into the cache rather than invalidated: the screen the
 * user lands on already knows who they are and does not flash its loading state
 * on the way in.
 */
export function replaceSession(queryClient: QueryClient, session: MeResponse): void {
  removeEverythingElse(queryClient)
  queryClient.setQueryData(sessionKeys.me(), session)
}

/**
 * Signing out has no session to write in its place, so the query is reset rather
 * than removed: the same object, emptied, which is the difference between every
 * mounted `useSession` hearing about it and none of them doing so.
 *
 * Resetting refetches it, and that one request is the point. `GET /api/me`
 * refusing is how this app spells "nobody" — it is what the route guard reads —
 * and it is a question the browser is allowed to ask without a session.
 */
export function forgetSession(queryClient: QueryClient): void {
  removeEverythingElse(queryClient)
  void queryClient.resetQueries({ queryKey: sessionKeys.all() })
}
