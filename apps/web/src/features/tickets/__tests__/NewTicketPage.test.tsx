import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { forwardToApi, mswServer } from '@/test/msw/server'
import { renderWithProviders } from '@/test/renderWithProviders'
import { NewTicketPage } from '@/features/tickets/NewTicketPage'

/**
 * Records what the form actually posts and still lets the real API answer, so
 * the assertions are about the request that went out rather than about a stub.
 */
function recordCreateRequests(): unknown[] {
  const bodies: unknown[] = []

  mswServer.use(
    http.post('/api/tickets', async ({ request }) => {
      bodies.push(await request.clone().json())
      return forwardToApi(request)
    }),
  )

  return bodies
}

describe('NewTicketPage', () => {
  it('reports every missing field and does not call the API', async () => {
    const created = recordCreateRequests()

    renderWithProviders(<NewTicketPage />, { initialEntries: ['/tickets/new'] })

    await userEvent.click(screen.getByRole('button', { name: 'Create ticket' }))

    expect(await screen.findByText('A title is required.')).toBeInTheDocument()
    expect(
      screen.getByText('Describe what happened so an agent can pick this up.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Choose a priority.')).toBeInTheDocument()
    expect(created).toHaveLength(0)
  })

  it('rejects a title that is too short', async () => {
    renderWithProviders(<NewTicketPage />, { initialEntries: ['/tickets/new'] })

    await userEvent.type(screen.getByLabelText('Title'), 'Bug')
    await userEvent.click(screen.getByRole('button', { name: 'Create ticket' }))

    expect(
      await screen.findByText('Use at least 5 characters so the ticket is searchable.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true')
  })

  it('creates a ticket when the form is valid', async () => {
    const created = recordCreateRequests()

    renderWithProviders(<NewTicketPage />, { initialEntries: ['/tickets/new'] })

    await userEvent.type(screen.getByLabelText('Title'), 'Checkout page returns a 500')
    await userEvent.type(screen.getByLabelText('Description'), 'Happens on every card payment.')
    await userEvent.selectOptions(screen.getByLabelText('Priority'), 'high')
    await userEvent.type(screen.getByLabelText('Assignee'), 'Dana Whitfield')

    await userEvent.click(screen.getByRole('button', { name: 'Create ticket' }))

    await vi.waitFor(() => expect(created).toHaveLength(1))
    expect(created[0]).toEqual({
      title: 'Checkout page returns a 500',
      description: 'Happens on every card payment.',
      priority: 'high',
      assignee: 'Dana Whitfield',
    })
  })
})
