import type { Hono, MiddlewareHandler } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { loginBodySchema, registerBodySchema } from '@harness-sample/shared'
import type { LoginLimiter } from './loginLimiter'
import { fail, invalid, readJsonBody, type ApiContext, type AppEnv } from './respond'
import type { SessionStore } from './sessionStore'
import type { UserStore } from './userStore'

/**
 * Authentication: the cookie, the three routes that manage it, and the two
 * middlewares that decide who may reach everything else.
 *
 * These live here rather than in `app.ts` because `createApiApp` is a single
 * function against a 185-line ceiling that it is already within a few lines of.
 * Four more routes inline would fail `lint:strict` on arrival, and the threshold
 * is right: a function that registers every route in the app is the one place
 * where "just one more" never stops being true.
 *
 * **The client never reads the cookie.** It is `httpOnly`, so it cannot, which
 * is the point: there is no token in JavaScript to steal through an injected
 * script, and no code path where the client believes it is signed in because of
 * something it wrote down itself. What the client knows is whether `GET /api/me`
 * answers.
 */

export const SESSION_COOKIE = 'sd_session'

export interface AuthDeps {
  users: UserStore
  sessions: SessionStore
  limiter: LoginLimiter
}

/**
 * `SameSite=Lax` rather than `Strict`: this app is one origin and follows no
 * cross-site links into itself, so `Strict` would cost nothing and gain nothing,
 * and `Lax` is the setting a reader expects to see justified rather than a
 * stricter one they have to check.
 *
 * **`Secure` is deliberately absent.** The app runs over plain http on
 * localhost, through the Vite proxy, and a `Secure` cookie would never be sent
 * back — the session would appear to work and then not exist. Anything serving
 * this over the network should add it, and that is one line here.
 */
function setSessionCookie(c: ApiContext, token: string): void {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
  })
}

/** The paths that must be reachable without a session, or nobody can get one. */
const PUBLIC_PATHS: readonly string[] = [
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/logout',
]

/**
 * Puts the signed-in user on the context, or refuses the request.
 *
 * Every route except the public three is behind this, including `GET /api/me` —
 * which is what makes "am I signed in?" a question with an honest answer rather
 * than a shape the client has to interpret.
 */
export function requireSession({ users, sessions }: AuthDeps): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    if (PUBLIC_PATHS.includes(c.req.path)) {
      await next()
      return
    }

    const token = getCookie(c, SESSION_COOKIE)
    const userId = token === undefined ? undefined : sessions.userIdFor(token)
    const user = userId === undefined ? undefined : users.get(userId)

    if (!user) {
      return fail(c, 401, 'unauthorized', 'Sign in to continue.')
    }

    c.set('user', user)
    await next()
    return
  }
}

/**
 * Refuses a signed-in agent.
 *
 * Applied per route rather than by path prefix, because the routes it guards are
 * not a prefix: `PATCH /api/tickets/:id` is an agent's daily work and
 * `DELETE /api/tickets/:id` is not, and they differ only in the verb.
 */
export function requireAdmin(): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    if (c.get('user').role !== 'admin') {
      return fail(c, 403, 'forbidden', 'That action is for administrators.')
    }

    await next()
    return
  }
}

export function registerAuthRoutes(app: Hono<AppEnv>, deps: AuthDeps): void {
  const { users, sessions, limiter } = deps

  app.post('/api/auth/register', async (c) => {
    const raw = await readJsonBody(c)

    if (!raw.ok) {
      return fail(c, 400, 'validation_failed', 'The request body is not valid JSON.')
    }

    const body = registerBodySchema.safeParse(raw.value)

    if (!body.success) {
      return invalid(c, body.error, 'registration')
    }

    const user = users.create(body.data)

    if (!user) {
      return fail(c, 409, 'conflict', 'That email address is already registered.')
    }

    // Registering signs you in. The alternative is a form that succeeds and
    // then asks you to type the same password again, which is a step that
    // exists only because somebody forgot to take it out.
    setSessionCookie(c, sessions.create(user.id))

    return c.json({ user }, 201)
  })

  app.post('/api/auth/login', async (c) => {
    const raw = await readJsonBody(c)

    if (!raw.ok) {
      return fail(c, 400, 'validation_failed', 'The request body is not valid JSON.')
    }

    const body = loginBodySchema.safeParse(raw.value)

    if (!body.success) {
      return invalid(c, body.error, 'sign-in')
    }

    const { email, password } = body.data

    if (!limiter.isAllowed(email)) {
      return fail(
        c,
        429,
        'rate_limited',
        'Too many sign-in attempts. Wait a few minutes and try again.',
      )
    }

    const user = users.verify(email, password)

    if (!user) {
      limiter.recordFailure(email)

      // One message for a wrong password and for an account that does not
      // exist. Telling the two apart is how a sign-in form becomes a way to
      // find out who has an account here.
      return fail(c, 401, 'unauthorized', 'That email address and password do not match.')
    }

    limiter.clear(email)
    setSessionCookie(c, sessions.create(user.id))

    return c.json({ user })
  })

  app.post('/api/auth/logout', (c) => {
    const token = getCookie(c, SESSION_COOKIE)

    if (token !== undefined) {
      sessions.destroy(token)
    }

    // Idempotent: signing out when already signed out is what a stale tab does,
    // and answering it with an error would be answering a question nobody asked.
    deleteCookie(c, SESSION_COOKIE, { path: '/' })

    return c.body(null, 204)
  })
}
