import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SEED_AGENT_EMAIL } from '@harness-sample/api/userSeed'
import { signInTestUser } from '@/test/msw/server'
import { renderWithProviders } from '@/test/renderWithProviders'
import { AppRoutes } from '@/app/AppRoutes'

/**
 * A screen not every role may reach, exercised through the real route tree —
 * the same shape as `RequireSession.test`, and for the same reason: a guard only
 * does anything between routes, so a test that rendered the page component would
 * never see it.
 *
 * The role is set at both ends. The client decides what the nav draws and what
 * the guard allows; the server decides whether the requests behind the screen
 * are answered at all. Setting one and not the other would be a test of half a
 * rule.
 */
function renderApp(path: string, role: 'agent' | 'admin') {
  signInTestUser(role === 'agent' ? SEED_AGENT_EMAIL : undefined)

  return renderWithProviders(<AppRoutes />, { role, initialEntries: [path] })
}

describe('the reports screen', () => {
  it('is in an admin nav', async () => {
    renderApp('/tickets', 'admin')

    expect(await screen.findByRole('link', { name: 'Reports' })).toBeInTheDocument()
  })

  it('is not in an agent nav', async () => {
    renderApp('/tickets', 'agent')

    await screen.findByRole('navigation', { name: 'Main' })

    expect(screen.queryByRole('link', { name: 'Reports' })).not.toBeInTheDocument()
  })

  it('turns an agent away from the address rather than only hiding the link', async () => {
    renderApp('/reports', 'agent')

    // The queue, which is where everyone belongs: there is nothing to be done
    // about a screen that is not yours, so there is nothing to say about it.
    expect(await screen.findByRole('heading', { name: 'Tickets' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Reports' })).not.toBeInTheDocument()
  })

  it('lets an admin in', async () => {
    renderApp('/reports', 'admin')

    expect(await screen.findByRole('heading', { name: 'Reports' })).toBeInTheDocument()
  })
})
