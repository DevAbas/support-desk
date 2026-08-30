import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { SEED_ADMIN_EMAIL, SEED_PASSWORD } from '@harness-sample/api/userSeed'
import { mswServer, signOutTestUser } from '@/test/msw/server'
import { renderWithProviders } from '@/test/renderWithProviders'
import { AppRoutes } from '@/app/AppRoutes'

/**
 * Route protection, exercised through the real route tree.
 *
 * Everything else in this suite renders one page component, which is the right
 * shape for a test about that page — but a guard only does anything between
 * routes, so this file renders `AppRoutes` inside the memory router and lets the
 * app decide what to show.
 */

function renderApp(path: string) {
  return renderWithProviders(<AppRoutes />, { role: 'admin', initialEntries: [path] })
}

async function signIn() {
  await userEvent.type(screen.getByLabelText('Email'), SEED_ADMIN_EMAIL)
  await userEvent.type(screen.getByLabelText('Password'), SEED_PASSWORD)
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('a signed-out visitor', () => {
  it('is sent to the sign-in form instead of the screen they asked for', async () => {
    signOutTestUser()

    renderApp('/reports')

    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument()
  })

  it('is returned to where they were headed once they sign in', async () => {
    signOutTestUser()

    renderApp('/reports')

    await screen.findByRole('button', { name: 'Sign in' })
    await signIn()

    // The reports screen, not the tickets one every session otherwise opens on.
    expect(await screen.findByRole('heading', { name: 'Reports' })).toBeInTheDocument()
  })

  it('lands on the queue when they asked for nothing in particular', async () => {
    signOutTestUser()

    renderApp('/login')

    await screen.findByRole('button', { name: 'Sign in' })
    await signIn()

    expect(await screen.findByRole('heading', { name: 'Tickets' })).toBeInTheDocument()
  })

  it('is not sent off the site by a next it did not write', async () => {
    signOutTestUser()

    renderApp('/login?next=//evil.example/takeover')

    await screen.findByRole('button', { name: 'Sign in' })
    await signIn()

    expect(await screen.findByRole('heading', { name: 'Tickets' })).toBeInTheDocument()
  })
})

describe('a signed-in user', () => {
  it('reaches the screen they asked for, with the shell around it', async () => {
    renderApp('/reports')

    expect(await screen.findByRole('heading', { name: 'Reports' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
  })

  it('is shown their name and a way out, not a role badge alone', async () => {
    renderApp('/tickets')

    expect(await screen.findByText('Dana Whitfield')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
    expect(screen.queryByText('Signed in as')).not.toBeInTheDocument()
  })

  it('has no Settings entry to visit any more', async () => {
    renderApp('/tickets')

    await screen.findByRole('navigation', { name: 'Main' })

    expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument()
  })

  it('is taken to sign in again when a session expires under them', async () => {
    renderApp('/tickets')

    await screen.findByText('Showing 1–10 of 40')

    // The session lapses while the screen is open: the next request is refused.
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

    // The way out, rather than an error band above a table they cannot reload.
    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.queryByText('Sign in to continue.')).not.toBeInTheDocument()
  })

  it('signs out from the header and is returned to the form', async () => {
    renderApp('/tickets')

    await screen.findByText('Showing 1–10 of 40')
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })
})
