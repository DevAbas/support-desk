import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../../../lib/api'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { NewTicketPage } from '../NewTicketPage'

describe('NewTicketPage', () => {
  beforeEach(() => {
    api.resetTickets()
    vi.restoreAllMocks()
  })

  it('reports every missing field and does not call the API', async () => {
    const createTicket = vi.spyOn(api, 'createTicket')

    renderWithProviders(<NewTicketPage />, { initialEntries: ['/tickets/new'] })

    await userEvent.click(screen.getByRole('button', { name: 'Create ticket' }))

    expect(await screen.findByText('A title is required.')).toBeInTheDocument()
    expect(
      screen.getByText('Describe what happened so an agent can pick this up.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Choose a priority.')).toBeInTheDocument()
    expect(createTicket).not.toHaveBeenCalled()
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
    const createTicket = vi.spyOn(api, 'createTicket')

    renderWithProviders(<NewTicketPage />, { initialEntries: ['/tickets/new'] })

    await userEvent.type(screen.getByLabelText('Title'), 'Checkout page returns a 500')
    await userEvent.type(screen.getByLabelText('Description'), 'Happens on every card payment.')
    await userEvent.selectOptions(screen.getByLabelText('Priority'), 'high')
    await userEvent.type(screen.getByLabelText('Assignee'), 'Dana Whitfield')

    await userEvent.click(screen.getByRole('button', { name: 'Create ticket' }))

    expect(createTicket).toHaveBeenCalledWith({
      title: 'Checkout page returns a 500',
      description: 'Happens on every card payment.',
      priority: 'high',
      assignee: 'Dana Whitfield',
    })
  })
})
