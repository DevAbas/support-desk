import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { SEED_ADMIN_EMAIL, SEED_AGENT_EMAIL, SEED_PASSWORD } from '@support-desk/api/userSeed'
import { mswServer, signInTestUser, signOutTestUser } from '@/test/msw/server'
import { renderWithProviders } from '@/test/renderWithProviders'
import { AppRoutes } from '@/app/AppRoutes'

/**
 * The role the app shows when it comes from the session rather than from a prop.
 *
 * Every other file in this suite hands `RoleProvider` an `initialRole`, which
 * switches the session query off entirely. That is the right shortcut for a test
 * about a screen, and it is why the arrangement the browser actually runs was
 * exercised by nothing: `role: null` is the opposite of the shortcut, and gives
 * the provider `App.tsx` gives it — asking `GET /api/me`, mounted above the
 * router, so nothing below re-renders it and the session query is the only thing
 * that can.
 *
 * That last part is the whole of what these cases are for. Signing in,
 * registering, signing out and expiring each rewrite the session in the cache,
 * and each one is a chance to write it into a query nobody is listening to.
 */

const NEW_ACCOUNT = {
  name: 'Wren Halloway',
  email: 'wren.halloway@supportdesk.example',
  password: 'a-long-enough-password',
}

function renderApp(path: string) {
  return renderWithProviders(<AppRoutes />, { role: null, initialEntries: [path] })
}

/** The header names the person and badges the role, which is `useRole` alone. */
async function expectHeaderToRead(name: string, role: string): Promise<void> {
  const header = within(await screen.findByRole('banner'))

  expect(await header.findByText(name)).toBeInTheDocument()
  expect(header.getByText(role)).toBeInTheDocument()
}

async function signInAs(email: string): Promise<void> {
  await screen.findByRole('button', { name: 'Sign in' })
  await userEvent.type(screen.getByLabelText('Email'), email)
  await userEvent.type(screen.getByLabelText('Password'), SEED_PASSWORD)
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
}

async function register(): Promise<void> {
  await screen.findByRole('button', { name: 'Create account' })
  await userEvent.type(screen.getByLabelText('Name'), NEW_ACCOUNT.name)
  await userEvent.type(screen.getByLabelText('Email'), NEW_ACCOUNT.email)
  await userEvent.type(screen.getByLabelText('Password'), NEW_ACCOUNT.password)
  await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
}

/** Signs out through the header, which is the only way a user can. */
async function signOut(): Promise<void> {
  await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }))
  await screen.findByRole('button', { name: 'Sign in' })
}

describe('signing in', () => {
  it('shows the role the response carried, not the one the app defaults to', async () => {
    signOutTestUser()

    renderApp('/login')
    await signInAs(SEED_ADMIN_EMAIL)

    // 'Agent' is what `RoleProvider` falls back to with no session in hand, so
    // an admin badged as an agent is the provider never having heard the answer.
    await expectHeaderToRead('Dana Whitfield', 'Admin')
  })
})

describe('a second user in the same tab', () => {
  it('is not badged with the role the first one had', async () => {
    signInTestUser(SEED_ADMIN_EMAIL)

    renderApp('/tickets')
    await expectHeaderToRead('Dana Whitfield', 'Admin')

    await signOut()
    await signInAs(SEED_AGENT_EMAIL)

    await expectHeaderToRead('Marco Ellis', 'Agent')
  })

  it('is not badged with it after registering an account either', async () => {
    signInTestUser(SEED_ADMIN_EMAIL)

    renderApp('/tickets')
    await expectHeaderToRead('Dana Whitfield', 'Admin')

    await signOut()
    await userEvent.click(screen.getByRole('link', { name: 'Create one' }))
    await register()

    // Registration makes an agent. An admin badge here is the previous session
    // still on the screen, which is what the server was checked for and cleared.
    await expectHeaderToRead(NEW_ACCOUNT.name, 'Agent')
  })

  it('is not badged with it when the first session expired rather than ended', async () => {
    signInTestUser(SEED_ADMIN_EMAIL)

    renderApp('/tickets')
    await expectHeaderToRead('Dana Whitfield', 'Admin')

    // The session lapses while the screen is open: the next request is refused,
    // and the 401 handler — not the sign-out button — empties the cache.
    mswServer.use(
      http.get('/api/tickets', () =>
        HttpResponse.json(
          { error: { code: 'unauthorized', message: 'Sign in to continue.' } },
          { status: 401 },
        ),
      ),
    )
    signOutTestUser()

    await userEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByRole('button', { name: 'Sign in' })
    mswServer.resetHandlers()

    await signInAs(SEED_AGENT_EMAIL)

    await expectHeaderToRead('Marco Ellis', 'Agent')
  })
})

/**
 * The badge is the visible half; this is the half that gates controls. A role
 * read as 'agent' hides the bulk actions on the ticket queue, so an admin who
 * signed in through the form would find half the screen missing.
 */
describe('what the role gates', () => {
  beforeEach(() => {
    signOutTestUser()
  })

  it('offers an admin the bulk actions after signing in through the form', async () => {
    renderApp('/login')
    await signInAs(SEED_ADMIN_EMAIL)

    await screen.findByText('Showing 1–10 of 40')

    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0)
  })
})
