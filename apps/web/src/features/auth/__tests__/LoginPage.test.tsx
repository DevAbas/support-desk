import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SEED_ADMIN_EMAIL, SEED_PASSWORD } from '@support-desk/api/userSeed'
import { forwardToApi, mswServer, signOutTestUser } from '@/test/msw/server'
import { renderWithProviders } from '@/test/renderWithProviders'
import { LoginPage } from '@/features/auth/LoginPage'

/**
 * The sign-in screen, rendered signed out — which is the one condition the rest
 * of the suite arranges the opposite of, so every case here starts by undoing
 * the session `src/test/setup.ts` provides.
 */
beforeEach(() => {
  signOutTestUser()
})

/**
 * Records what the form actually posts and still lets the real API answer, so
 * the assertions are about the request that went out rather than about a stub.
 */
function recordLoginRequests(): unknown[] {
  const bodies: unknown[] = []

  mswServer.use(
    http.post('/api/auth/login', async ({ request }) => {
      bodies.push(await request.clone().json())
      return forwardToApi(request)
    }),
  )

  return bodies
}

function renderLogin(initialEntries: string[] = ['/login']) {
  return renderWithProviders(<LoginPage />, { initialEntries })
}

describe('LoginPage', () => {
  it('reports both missing fields and does not call the API', async () => {
    const attempts = recordLoginRequests()

    renderLogin()

    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Enter your email address.')).toBeInTheDocument()
    expect(screen.getByText('Enter your password.')).toBeInTheDocument()
    expect(attempts).toHaveLength(0)
  })

  it('signs a seeded user in', async () => {
    const attempts = recordLoginRequests()

    renderLogin()

    await userEvent.type(screen.getByLabelText('Email'), SEED_ADMIN_EMAIL)
    await userEvent.type(screen.getByLabelText('Password'), SEED_PASSWORD)
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await vi.waitFor(() => expect(attempts).toHaveLength(1))
    expect(attempts[0]).toEqual({ email: SEED_ADMIN_EMAIL, password: SEED_PASSWORD })

    // Nothing was reported: the failure band is what a rejected sign-in shows.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('reports a wrong password without saying which half was wrong', async () => {
    renderLogin()

    await userEvent.type(screen.getByLabelText('Email'), SEED_ADMIN_EMAIL)
    await userEvent.type(screen.getByLabelText('Password'), 'not-the-password')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    const alert = await screen.findByRole('alert')

    expect(alert).toHaveTextContent('That email address and password do not match.')
  })

  it('reports an unknown account in the same words', async () => {
    renderLogin()

    await userEvent.type(screen.getByLabelText('Email'), 'nobody@supportdesk.example')
    await userEvent.type(screen.getByLabelText('Password'), SEED_PASSWORD)
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That email address and password do not match.',
    )
  })

  it('stays on the form after a refusal, with the email still typed', async () => {
    renderLogin()

    await userEvent.type(screen.getByLabelText('Email'), SEED_ADMIN_EMAIL)
    await userEvent.type(screen.getByLabelText('Password'), 'not-the-password')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    await screen.findByRole('alert')

    expect(screen.getByLabelText('Email')).toHaveValue(SEED_ADMIN_EMAIL)
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
  })

  it('offers the way to registration', async () => {
    renderLogin()

    expect(await screen.findByRole('link', { name: 'Create one' })).toHaveAttribute(
      'href',
      '/register',
    )
  })
})
