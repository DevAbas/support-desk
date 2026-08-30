import { createApiApp, type ApiAppOptions } from '../app'
import { SESSION_COOKIE } from '../auth'
import { createSessionStore } from '../sessionStore'
import { createUserStore } from '../userStore'
import { SEED_ADMIN_EMAIL } from '../userSeed'

/**
 * What every api test needs before it can ask the API anything: an app with no
 * artificial latency, and a session.
 *
 * The session lives here rather than in each test file because it is not what
 * any of them are about. A test for the paging arithmetic should say what it
 * expects of the paging arithmetic; having to sign in first is a fact about the
 * API, and one place is where facts about the API belong.
 *
 * **Signed in as the admin by default.** The suite predates authentication and
 * asserts throughout that a bulk update updates and a delete deletes. Those
 * assertions are still the right ones — they are about the store, not about who
 * may reach it — so the default account is one that may. `createApp` takes an
 * email for the cases that need to be refused.
 *
 * **The session is minted from the store, not through the login route.** Setup
 * that goes through the thing under test fails twice for one cause: a broken
 * login would fail every test in the suite instead of the four that are about
 * logging in. It also keeps `createApp` synchronous, which is why every existing
 * call site reads exactly as it did before.
 */

export interface TestApp {
  /** The signature `Hono.request` has, with a session cookie added. */
  request: (path: string, init?: RequestInit) => Promise<Response>
  /** The app itself, for the cases that need to ask as a stranger. */
  app: ReturnType<typeof createApiApp>
  cookie: string
}

export function createApp(options: ApiAppOptions = {}, email: string = SEED_ADMIN_EMAIL): TestApp {
  const users = options.users ?? createUserStore()
  const sessions = options.sessions ?? createSessionStore(options.now)
  const app = createApiApp({ latencyMs: [0, 0], ...options, users, sessions })

  const user = users.findByEmail(email)

  if (!user) {
    throw new Error(`No seeded user has the email "${email}".`)
  }

  const cookie = `${SESSION_COOKIE}=${sessions.create(user.id)}`

  return {
    app,
    cookie,
    async request(path, init) {
      return await app.request(path, {
        ...init,
        headers: { ...(init?.headers as Record<string, string> | undefined), cookie },
      })
    },
  }
}

/** An app nobody has signed into. Its `request` carries no cookie. */
export function createSignedOutApp(options: ApiAppOptions = {}) {
  return createApiApp({ latencyMs: [0, 0], ...options })
}
