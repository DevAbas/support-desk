import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SEED_ADMIN_EMAIL } from '@support-desk/api/userSeed'
import { forwardToApi, mswServer, signOutTestUser } from '@/test/msw/server'
import { renderWithProviders } from '@/test/renderWithProviders'
import { RegisterPage } from '@/features/auth/RegisterPage'

beforeEach(() => {
  signOutTestUser()
})

function recordRegisterRequests(): unknown[] {
  const bodies: unknown[] = []

  mswServer.use(
    http.post('/api/auth/register', async ({ request }) => {
      bodies.push(await request.clone().json())
      return forwardToApi(request)
    }),
  )

  return bodies
}

const NEW_ACCOUNT = {
  name: 'Wren Halloway',
  email: 'wren.halloway@supportdesk.example',
  password: 'a-long-enough-password',
}

async function fillIn({ name, email, password }: typeof NEW_ACCOUNT) {
  await userEvent.type(screen.getByLabelText('Name'), name)
  await userEvent.type(screen.getByLabelText('Email'), email)
  await userEvent.type(screen.getByLabelText('Password'), password)
  await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
}

describe('RegisterPage', () => {
  it('reports every missing field and does not call the API', async () => {
    const attempts = recordRegisterRequests()

    renderWithProviders(<RegisterPage />, { initialEntries: ['/register'] })

    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(
      await screen.findByText('Enter your name so your colleagues know who is on a ticket.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
    expect(screen.getByText('Use at least 8 characters.')).toBeInTheDocument()
    expect(attempts).toHaveLength(0)
  })

  it('rejects a password below the length the contract requires', async () => {
    const attempts = recordRegisterRequests()

    renderWithProviders(<RegisterPage />, { initialEntries: ['/register'] })

    await fillIn({ ...NEW_ACCOUNT, password: 'short' })

    expect(await screen.findByText('Use at least 8 characters.')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true')
    expect(attempts).toHaveLength(0)
  })

  it('creates an account and signs the new user in', async () => {
    const attempts = recordRegisterRequests()

    renderWithProviders(<RegisterPage />, { initialEntries: ['/register'] })

    await fillIn(NEW_ACCOUNT)

    await vi.waitFor(() => expect(attempts).toHaveLength(1))
    expect(attempts[0]).toEqual(NEW_ACCOUNT)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('refuses an email that is already registered', async () => {
    renderWithProviders(<RegisterPage />, { initialEntries: ['/register'] })

    await fillIn({ ...NEW_ACCOUNT, email: SEED_ADMIN_EMAIL })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That email address is already registered.',
    )
  })

  it('refuses a second registration of an address the first one took', async () => {
    const { unmount } = renderWithProviders(<RegisterPage />, { initialEntries: ['/register'] })

    await fillIn(NEW_ACCOUNT)
    await vi.waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument())
    unmount()

    signOutTestUser()
    renderWithProviders(<RegisterPage />, { initialEntries: ['/register'] })

    await fillIn(NEW_ACCOUNT)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That email address is already registered.',
    )
  })

  it('offers the way back to signing in', async () => {
    renderWithProviders(<RegisterPage />, { initialEntries: ['/register'] })

    expect(await screen.findByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login')
  })
})
