/**
 * The login rate limiter: a fixed-window counter, in memory, keyed by email.
 *
 * **Why the email and not the address it came from.** Everything this app serves
 * arrives through the Vite proxy, so every request is `127.0.0.1` and an IP key
 * would be one shared bucket — five wrong passwords anywhere and the whole
 * development machine is locked out. Keying on the account is the protection
 * that is real here.
 *
 * What that does and does not stop, stated plainly: it stops a thousand guesses
 * at one account, and it does not stop one password sprayed across a thousand
 * accounts. A deployment behind a real proxy should add a second key on the
 * forwarded address; the shape below takes another key without changing.
 *
 * **A fixed window rather than a sliding one.** It admits at most one extra
 * burst at a boundary, which is the textbook complaint about fixed windows and
 * is worth nothing to an attacker held to five attempts. A sliding window is a
 * list of timestamps per account, and this is a counter and a number.
 */

export interface LoginLimiter {
  /** Whether this attempt is allowed to reach the password check at all. */
  isAllowed: (email: string) => boolean
  /** Counts a failure against the account. */
  recordFailure: (email: string) => void
  /** Forgets the account's failures. A correct password ends the window. */
  clear: (email: string) => void
  /** Restores the empty state. Tests call this between cases. */
  reset: () => void
}

interface AttemptWindow {
  failures: number
  /** When the window this counter belongs to closes. */
  endsAt: number
}

export const MAX_LOGIN_FAILURES = 5

export const LOGIN_WINDOW_MS = 15 * 60 * 1000

export function createLoginLimiter(now: () => number = Date.now): LoginLimiter {
  let windows = new Map<string, AttemptWindow>()

  function key(email: string): string {
    return email.trim().toLowerCase()
  }

  /** The account's live window, or undefined once the old one has run out. */
  function current(email: string): AttemptWindow | undefined {
    const window = windows.get(key(email))

    if (!window) {
      return undefined
    }

    if (window.endsAt <= now()) {
      windows.delete(key(email))
      return undefined
    }

    return window
  }

  return {
    isAllowed(email) {
      return (current(email)?.failures ?? 0) < MAX_LOGIN_FAILURES
    },

    recordFailure(email) {
      const window = current(email)

      if (window) {
        window.failures += 1
        return
      }

      // The window starts at the first failure, not at the first attempt: an
      // account nobody is guessing at never has one.
      windows.set(key(email), { failures: 1, endsAt: now() + LOGIN_WINDOW_MS })
    },

    clear(email) {
      windows.delete(key(email))
    },

    reset() {
      windows = new Map()
    },
  }
}
