import { describe, expect, it } from 'vitest'
import { apiErrorSchema, meResponseSchema, userSchema } from '@harness-sample/shared'
import { SESSION_COOKIE } from './auth'
import { LOGIN_WINDOW_MS, MAX_LOGIN_FAILURES } from './loginLimiter'
import { SESSION_TTL_MS } from './sessionStore'
import { createApp, createSignedOutApp } from './test/support'
import { SEED_ADMIN_EMAIL, SEED_AGENT_EMAIL, SEED_PASSWORD } from './userSeed'

/**
 * The authentication routes, exercised through `app.request` like everything
 * else, and — unlike everything else — starting from a stranger.
 *
 * `createSignedOutApp` is used throughout rather than the signed-in `createApp`
 * that the rest of the suite defaults to: these are the cases that are about how
 * a session is obtained, so arriving with one would be arriving after the part
 * under test.
 *
 * Time is moved by handing the app a clock, not by faking timers. Session expiry
 * and the rate-limit window are the only behaviour here that needs a later
 * "now", and a counter a test can advance is easier to read than a global that
 * has to be installed and torn down.
 */

const jsonRequest = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
})

async function expectError(response: Response, status: number, code: string): Promise<string[]> {
  expect(response.status).toBe(status)

  const body = apiErrorSchema.parse(await response.json())
  expect(body.error.code).toBe(code)

  return body.error.details ?? []
}

/** The `sd_session=…` pair, without the attributes that follow it. */
function sessionCookie(response: Response): string {
  const header = response.headers.get('set-cookie') ?? ''

  expect(header).toContain(`${SESSION_COOKIE}=`)

  return header.split(';')[0] ?? ''
}

function login(app: ReturnType<typeof createSignedOutApp>, email: string, password: string) {
  return app.request('/api/auth/login', jsonRequest({ email, password }))
}

const NEW_ACCOUNT = {
  name: 'Wren Halloway',
  email: 'wren.halloway@supportdesk.example',
  password: 'a-long-enough-password',
}

describe('POST /api/auth/register', () => {
  it('creates an agent and signs them in', async () => {
    const app = createSignedOutApp()
    const response = await app.request('/api/auth/register', jsonRequest(NEW_ACCOUNT))

    expect(response.status).toBe(201)

    const body = meResponseSchema.parse(await response.json())

    expect(body.user).toMatchObject({ name: 'Wren Halloway', role: 'agent' })

    // The cookie the response set is enough to be signed in with: registering
    // does not then ask for the same password again.
    const me = await app.request('/api/me', { headers: { cookie: sessionCookie(response) } })

    expect(meResponseSchema.parse(await me.json()).user.id).toBe(body.user.id)
  })

  it('never answers with a password, hashed or otherwise', async () => {
    const app = createSignedOutApp()
    const response = await app.request('/api/auth/register', jsonRequest(NEW_ACCOUNT))
    const payload: unknown = await response.json()

    // Parsed by the contract schema and then checked as raw JSON, because the
    // schema would strip an extra field rather than report it.
    expect(userSchema.parse((payload as { user: unknown }).user)).toBeDefined()
    expect(JSON.stringify(payload)).not.toContain('password')
    expect(JSON.stringify(payload)).not.toContain('scrypt')
  })

  it('refuses an email that is already registered', async () => {
    const app = createSignedOutApp()

    await app.request('/api/auth/register', jsonRequest(NEW_ACCOUNT))

    const second = await app.request('/api/auth/register', jsonRequest(NEW_ACCOUNT))

    await expectError(second, 409, 'conflict')
  })

  it('refuses an email a seeded user already holds, whatever its casing', async () => {
    const response = await createSignedOutApp().request(
      '/api/auth/register',
      jsonRequest({ ...NEW_ACCOUNT, email: SEED_ADMIN_EMAIL.toUpperCase() }),
    )

    await expectError(response, 409, 'conflict')
  })

  it('names every field it rejected', async () => {
    const details = await expectError(
      await createSignedOutApp().request(
        '/api/auth/register',
        jsonRequest({ name: '', email: 'not-an-email', password: 'short' }),
      ),
      400,
      'validation_failed',
    )

    expect(details.map((detail) => detail.split(':')[0])).toEqual(['name', 'email', 'password'])
  })
})

describe('POST /api/auth/login', () => {
  it('signs a seeded user in', async () => {
    const app = createSignedOutApp()
    const response = await login(app, SEED_ADMIN_EMAIL, SEED_PASSWORD)

    expect(response.status).toBe(200)
    expect(meResponseSchema.parse(await response.json()).user).toMatchObject({
      name: 'Dana Whitfield',
      role: 'admin',
    })

    const cookie = sessionCookie(response)

    expect(cookie).toContain(`${SESSION_COOKIE}=`)

    const me = await app.request('/api/me', { headers: { cookie } })

    expect(me.status).toBe(200)
  })

  it('sets a cookie the client cannot read', async () => {
    const response = await login(createSignedOutApp(), SEED_ADMIN_EMAIL, SEED_PASSWORD)
    const header = response.headers.get('set-cookie') ?? ''

    expect(header).toContain('HttpOnly')
    expect(header).toContain('SameSite=Lax')
    expect(header).toContain('Path=/')
  })

  it('refuses a wrong password', async () => {
    const response = await login(createSignedOutApp(), SEED_ADMIN_EMAIL, 'not-the-password')

    await expectError(response, 401, 'unauthorized')
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it('answers a wrong password and an unknown account identically', async () => {
    const app = createSignedOutApp()

    const wrongPassword = await login(app, SEED_ADMIN_EMAIL, 'not-the-password')
    const noSuchAccount = await login(app, 'nobody@supportdesk.example', SEED_PASSWORD)

    expect(noSuchAccount.status).toBe(wrongPassword.status)

    // Same message, so the form cannot be used to find out who has an account.
    const [first, second] = await Promise.all([wrongPassword.json(), noSuchAccount.json()])

    expect(apiErrorSchema.parse(second).error.message).toBe(
      apiErrorSchema.parse(first).error.message,
    )
  })
})

describe('the login rate limit', () => {
  it('refuses further attempts after too many failures, and says why', async () => {
    const app = createSignedOutApp()

    for (let attempt = 0; attempt < MAX_LOGIN_FAILURES; attempt += 1) {
      await expectError(await login(app, SEED_ADMIN_EMAIL, 'wrong'), 401, 'unauthorized')
    }

    await expectError(await login(app, SEED_ADMIN_EMAIL, 'wrong'), 429, 'rate_limited')

    // Locked even for the right password: a limit that the correct password
    // walks past is a limit on typing, not on guessing.
    await expectError(await login(app, SEED_ADMIN_EMAIL, SEED_PASSWORD), 429, 'rate_limited')
  })

  it('holds one account and not the others', async () => {
    const app = createSignedOutApp()

    for (let attempt = 0; attempt <= MAX_LOGIN_FAILURES; attempt += 1) {
      await login(app, SEED_ADMIN_EMAIL, 'wrong')
    }

    expect((await login(app, SEED_AGENT_EMAIL, SEED_PASSWORD)).status).toBe(200)
  })

  it('lets the account back in once the window has passed', async () => {
    let now = Date.parse('2026-08-29T09:00:00.000Z')
    const app = createSignedOutApp({ now: () => now })

    for (let attempt = 0; attempt <= MAX_LOGIN_FAILURES; attempt += 1) {
      await login(app, SEED_ADMIN_EMAIL, 'wrong')
    }

    await expectError(await login(app, SEED_ADMIN_EMAIL, SEED_PASSWORD), 429, 'rate_limited')

    now += LOGIN_WINDOW_MS + 1

    expect((await login(app, SEED_ADMIN_EMAIL, SEED_PASSWORD)).status).toBe(200)
  })

  it('forgets the failures once a password is right', async () => {
    const app = createSignedOutApp()

    for (let attempt = 0; attempt < MAX_LOGIN_FAILURES - 1; attempt += 1) {
      await login(app, SEED_ADMIN_EMAIL, 'wrong')
    }

    expect((await login(app, SEED_ADMIN_EMAIL, SEED_PASSWORD)).status).toBe(200)

    // The counter is back at zero, so the next wrong password is the first one.
    for (let attempt = 0; attempt < MAX_LOGIN_FAILURES; attempt += 1) {
      await expectError(await login(app, SEED_ADMIN_EMAIL, 'wrong'), 401, 'unauthorized')
    }
  })
})

describe('POST /api/auth/logout', () => {
  it('ends the session it was called with', async () => {
    const app = createSignedOutApp()
    const cookie = sessionCookie(await login(app, SEED_ADMIN_EMAIL, SEED_PASSWORD))

    const response = await app.request('/api/auth/logout', { method: 'POST', headers: { cookie } })

    expect(response.status).toBe(204)

    // The token is dead on the server, not merely dropped by the browser.
    await expectError(await app.request('/api/me', { headers: { cookie } }), 401, 'unauthorized')
  })

  it('is happy to sign out a caller who never signed in', async () => {
    const response = await createSignedOutApp().request('/api/auth/logout', { method: 'POST' })

    expect(response.status).toBe(204)
  })
})

describe('a session that has expired', () => {
  it('stops being accepted', async () => {
    let now = Date.parse('2026-08-29T09:00:00.000Z')
    const app = createSignedOutApp({ now: () => now })
    const cookie = sessionCookie(await login(app, SEED_ADMIN_EMAIL, SEED_PASSWORD))

    expect((await app.request('/api/me', { headers: { cookie } })).status).toBe(200)

    now += SESSION_TTL_MS + 1

    await expectError(await app.request('/api/me', { headers: { cookie } }), 401, 'unauthorized')
  })
})

describe('the routes that require a session', () => {
  it('refuses every one of them to a stranger', async () => {
    const app = createSignedOutApp()

    const paths = ['/api/tickets', '/api/tickets/TCK-0001', '/api/customers', '/api/reports/summary']

    for (const path of paths) {
      await expectError(await app.request(path), 401, 'unauthorized')
    }
  })

  it('still lets a forced failure fail first, so the knob keeps working', async () => {
    await expectError(
      await createSignedOutApp({ failAlways: true }).request('/api/tickets'),
      500,
      'forced_failure',
    )
  })
})

describe('the routes that require an administrator', () => {
  it('refuses an agent, having recognised them', async () => {
    const app = createApp({}, SEED_AGENT_EMAIL)

    await expectError(
      await app.request('/api/tickets/TCK-0001', { method: 'DELETE' }),
      403,
      'forbidden',
    )

    await expectError(
      await app.request('/api/tickets/bulk', {
        ...jsonRequest({ ids: ['TCK-0001'], status: 'closed' }),
        method: 'PATCH',
      }),
      403,
      'forbidden',
    )

    await expectError(
      await app.request('/api/customers/bulk', {
        ...jsonRequest({ ids: ['CUS-0001'], plan: 'pro' }),
        method: 'PATCH',
      }),
      403,
      'forbidden',
    )
  })

  it('refuses an agent the reports, which are a view of the agents', async () => {
    const app = createApp({}, SEED_AGENT_EMAIL)

    // Not a destructive route, and still administrators' work: the assignee
    // report ranks named people by how much each of them resolved. The nav, the
    // route guard and the global search all read the same `roles` on
    // `NAVIGATION_TARGETS`; this is the half a client cannot talk its way past.
    await expectError(await app.request('/api/reports/summary'), 403, 'forbidden')
    await expectError(await app.request('/api/reports/breakdown'), 403, 'forbidden')
    await expectError(await app.request('/api/reports/assignees'), 403, 'forbidden')
  })

  it('leaves an agent the work that is theirs', async () => {
    const app = createApp({}, SEED_AGENT_EMAIL)

    expect((await app.request('/api/tickets')).status).toBe(200)

    const patched = await app.request('/api/tickets/TCK-0001', {
      ...jsonRequest({ status: 'pending' }),
      method: 'PATCH',
    })

    expect(patched.status).toBe(200)
  })

  it('refused the agent without touching the queue', async () => {
    const agent = createApp({}, SEED_AGENT_EMAIL)

    await agent.request('/api/tickets/TCK-0001', { method: 'DELETE' })

    expect((await agent.request('/api/tickets/TCK-0001')).status).toBe(200)
  })
})
