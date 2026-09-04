import { http, type HttpResponseResolver } from 'msw'
import { createApiApp } from '@support-desk/api/app'
import { createCustomerStore } from '@support-desk/api/customerStore'
import { createSessionStore } from '@support-desk/api/sessionStore'
import { createTicketStore } from '@support-desk/api/store'
import { createUserStore } from '@support-desk/api/userStore'
import { SESSION_COOKIE } from '@support-desk/api/auth'
import { SEED_ADMIN_EMAIL } from '@support-desk/api/userSeed'

/**
 * MSW intercepts the request and hands it to the real API.
 *
 * The alternative — handlers that return fixtures — would mean the tests agreed
 * with a second, hand-written implementation of the queue rather than with the
 * one the app talks to. Forwarding to `app.fetch` means a test exercises the
 * real query layer against the real routing, validation and paging, and a
 * contract broken on either side fails here.
 *
 * The latency the server adds in development is turned off: it is there to make
 * loading states real, and a test that waits for it is only slower.
 */

export const apiTestStore = createTicketStore()

/**
 * Built here rather than left to the app to build, so that `src/test/setup.ts`
 * has a handle on it. The customer list has writes now, and a customer moved to
 * Enterprise or deleted by one test would still be moved or gone in the next.
 */
export const apiTestCustomerStore = createCustomerStore(apiTestStore)

export const apiTestUserStore = createUserStore()

export const apiTestSessionStore = createSessionStore()

const app = createApiApp({
  store: apiTestStore,
  customers: apiTestCustomerStore,
  users: apiTestUserStore,
  sessions: apiTestSessionStore,
  latencyMs: [0, 0],
})

/**
 * The session, held here because jsdom has no cookie jar of its own.
 *
 * `rememberSession` below keeps it in step with what the API sets, so a test
 * that fills in the sign-in form ends up signed in exactly as a browser would.
 * `signInTestUser` is the shortcut past that, called from `src/test/setup.ts`
 * before every test so that a screen test says what it expects of the screen and
 * nothing about signing in. The tests that *are* about signing in call
 * `signOutTestUser` first.
 */
let sessionCookie: string | null = null

/** Signs the suite in as the seeded admin, which is what most screens assume. */
export function signInTestUser(email: string = SEED_ADMIN_EMAIL): void {
  const user = apiTestUserStore.findByEmail(email)

  if (!user) {
    throw new Error(`No seeded user has the email "${email}".`)
  }

  sessionCookie = `${SESSION_COOKIE}=${apiTestSessionStore.create(user.id)}`
}

/** Leaves the suite signed out, for the tests that are about getting in. */
export function signOutTestUser(): void {
  sessionCookie = null
}

/**
 * The cookie jar jsdom does not give us, in the two lines it actually needs.
 *
 * A `Set-Cookie` on the way out is remembered and attached on the way in, so a
 * test that fills in the sign-in form is signed in afterwards for the same
 * reason a browser would be — the server issued a session and the next request
 * carried it. Signing out clears the value the same way, because that is what
 * the server's expiry header means.
 */
function rememberSession(response: Response): void {
  const header = response.headers.get('set-cookie')

  if (header === null || !header.includes(`${SESSION_COOKIE}=`)) {
    return
  }

  const pair = header.split(';')[0] ?? ''

  sessionCookie = pair.endsWith('=') ? null : pair
}

/** Exported so a one-off handler can inspect a request and still answer it. */
export async function forwardToApi(request: Request): Promise<Response> {
  const outgoing =
    sessionCookie === null
      ? request
      : new Request(request, {
          headers: { ...Object.fromEntries(request.headers), cookie: sessionCookie },
        })

  const response = await app.fetch(outgoing)

  rememberSession(response)

  return response
}

const forward: HttpResponseResolver = ({ request }) => forwardToApi(request)

export const handlers = [
  http.get('/api/me', forward),
  http.post('/api/auth/register', forward),
  http.post('/api/auth/login', forward),
  http.post('/api/auth/logout', forward),
  http.get('/api/search', forward),
  http.get('/api/tickets', forward),
  http.post('/api/tickets', forward),
  // Ahead of the `:id` handlers, so `bulk` is matched as the collection
  // operation it is rather than as a ticket id — the same order the API
  // registers them in.
  http.post('/api/tickets/bulk/moves', forward),
  http.delete('/api/tickets/bulk', forward),
  http.get('/api/tickets/:id', forward),
  http.patch('/api/tickets/:id', forward),
  http.delete('/api/tickets/:id', forward),
  http.get('/api/tickets/:id/moves', forward),
  http.post('/api/tickets/:id/moves', forward),
  http.post('/api/tickets/:id/comments', forward),
  http.get('/api/customers', forward),
  http.patch('/api/customers/bulk', forward),
  http.delete('/api/customers/bulk', forward),
  http.get('/api/customers/:id', forward),
  http.get('/api/reports/summary', forward),
  http.get('/api/reports/breakdown', forward),
  http.get('/api/reports/assignees', forward),
]
