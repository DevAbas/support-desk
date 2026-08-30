import { randomBytes } from 'node:crypto'

/**
 * The in-memory session store.
 *
 * **A token rather than a JWT.** A signed token exists so that a server can
 * trust a claim it is not holding a copy of. This server is holding the copy —
 * the sessions are a `Map` three lines below — so a JWT would buy nothing and
 * cost the thing that makes a session a session: signing out would leave a token
 * that stays valid until it expires, because there would be nothing to delete.
 *
 * Sessions are lost when the API restarts, like everything else here. That is
 * not an oversight to apologise for in a reference app; it is also the easiest
 * way to see the 401 path work, which is step seven of the walkthrough.
 *
 * The clock is passed in rather than read. Expiry is the one behaviour here that
 * a test cannot exercise without moving time, and `Date.now` is not something a
 * test can move without fake timers, which this suite does not use anywhere.
 */

export interface SessionStore {
  /** The new token. The caller puts it in a cookie. */
  create: (userId: string) => string
  /** The user id, when the token names a session that has not expired. */
  userIdFor: (token: string) => string | undefined
  /** Whether there was one to end. */
  destroy: (token: string) => boolean
  /** Restores the empty state. Tests call this between cases. */
  reset: () => void
}

interface SessionRecord {
  userId: string
  expiresAt: number
}

/**
 * Twelve hours: a working day and the overrun on it, so a session outlasts the
 * shift it was opened for and does not outlast the week.
 */
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000

/**
 * 256 bits from a CSPRNG, base64url so it survives a cookie value untouched.
 * The token is the whole credential, so it has to be unguessable and it has to
 * carry nothing — an id that means something is an id somebody can reason about.
 */
const TOKEN_BYTES = 32

export function createSessionStore(now: () => number = Date.now): SessionStore {
  let sessions = new Map<string, SessionRecord>()

  return {
    create(userId) {
      const token = randomBytes(TOKEN_BYTES).toString('base64url')

      sessions.set(token, { userId, expiresAt: now() + SESSION_TTL_MS })

      return token
    },

    userIdFor(token) {
      const session = sessions.get(token)

      if (!session) {
        return undefined
      }

      // Expiry is enforced on read rather than swept on a timer: a session
      // nobody presents again costs a map entry until the next restart, and a
      // timer in a reference app is a background thing to explain.
      if (session.expiresAt <= now()) {
        sessions.delete(token)
        return undefined
      }

      return session.userId
    },

    destroy(token) {
      return sessions.delete(token)
    },

    reset() {
      sessions = new Map()
    },
  }
}
