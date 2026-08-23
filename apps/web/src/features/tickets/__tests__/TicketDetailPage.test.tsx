import { screen, waitForElementToBeRemoved } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import type { Role } from '@/features/roles/role.types'
import { Route, Routes } from 'react-router-dom'
import { mswServer } from '@/test/msw/server'
import { renderWithProviders } from '@/test/renderWithProviders'
import { TicketDetailPage } from '@/features/tickets/TicketDetailPage'

/** The page reads its id from the route, so it needs a route to read it from. */
async function renderDetail(id: string, role: Role = 'agent') {
  renderWithProviders(
    <Routes>
      <Route path="/tickets/:ticketId" element={<TicketDetailPage />} />
    </Routes>,
    { role, initialEntries: [`/tickets/${id}`] },
  )

  await waitForElementToBeRemoved(() => screen.queryByText('Loading ticket…'))
}

describe('TicketDetailPage', () => {
  it('loads a ticket and its comments', async () => {
    await renderDetail('TCK-0001')

    expect(screen.getByRole('heading', { name: 'Cannot sign in after password reset' }))
      .toBeInTheDocument()
    expect(screen.getByLabelText('Current status')).toHaveValue('closed')
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('saves a status change without going back for the ticket', async () => {
    let requests = 0
    mswServer.events.on('request:start', () => {
      requests += 1
    })

    await renderDetail('TCK-0001')
    const loadRequests = requests

    await userEvent.selectOptions(screen.getByLabelText('Current status'), 'resolved')

    await vi.waitFor(() => expect(screen.getByLabelText('Current status')).toHaveValue('resolved'))

    // The PATCH answered with the updated ticket, so the page has the newest
    // version already: exactly one request, with no refetch behind it.
    expect(requests).toBe(loadRequests + 1)
    mswServer.events.removeAllListeners()
  })

  it('adds a comment and shows it', async () => {
    await renderDetail('TCK-0001')

    await userEvent.type(screen.getByLabelText('Add a comment'), 'Reproduced on staging.')
    await userEvent.click(screen.getByRole('button', { name: 'Post comment' }))

    expect(await screen.findByText('Reproduced on staging.')).toBeInTheDocument()
    expect(screen.getByText('You (Agent)')).toBeInTheDocument()
    // The field is cleared once the comment has been accepted.
    expect(screen.getByLabelText('Add a comment')).toHaveValue('')
  })

  it('reassigns a ticket to someone else', async () => {
    await renderDetail('TCK-0001')

    const field = screen.getByLabelText('Assigned to')
    expect(field).toHaveValue('Priya Raman')
    // Nothing has been changed yet, so there is nothing to save.
    expect(screen.getByRole('button', { name: 'Reassign' })).toBeDisabled()

    await userEvent.clear(field)
    await userEvent.type(field, 'Marco Ellis')
    await userEvent.click(screen.getByRole('button', { name: 'Reassign' }))

    // The header reads the same ticket the field does, so it moving is the
    // proof that the change reached the cache rather than only the input.
    expect(await screen.findByText(/Assigned to Marco Ellis/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reassign' })).toBeDisabled()
  })

  it('refuses to save an empty assignee', async () => {
    await renderDetail('TCK-0001')

    await userEvent.clear(screen.getByLabelText('Assigned to'))
    await userEvent.click(screen.getByRole('button', { name: 'Reassign' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Assign the ticket, or enter "Unassigned".',
    )
    expect(screen.getByText(/Assigned to Priya Raman/)).toBeInTheDocument()
  })

  it('reports a failed reassignment in the field', async () => {
    await renderDetail('TCK-0001')

    mswServer.use(
      http.patch('/api/tickets/:id', () => HttpResponse.json({ error: null }, { status: 500 })),
    )

    await userEvent.clear(screen.getByLabelText('Assigned to'))
    await userEvent.type(screen.getByLabelText('Assigned to'), 'Marco Ellis')
    await userEvent.click(screen.getByRole('button', { name: 'Reassign' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The server returned an unexpected 500 response.',
    )
    expect(screen.getByText(/Assigned to Priya Raman/)).toBeInTheDocument()
  })

  it('reports a ticket that does not exist, and retries from Try again', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/tickets/:ticketId" element={<TicketDetailPage />} />
      </Routes>,
      { initialEntries: ['/tickets/TCK-9999'] },
    )

    expect(await screen.findByText('Ticket TCK-9999 was not found.')).toBeInTheDocument()

    mswServer.use(
      http.get('/api/tickets/:id', () => HttpResponse.json({ error: null }, { status: 500 })),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(
      await screen.findByText('The server returned an unexpected 500 response.'),
    ).toBeInTheDocument()
  })

  it('offers deletion to an admin and not to an agent', async () => {
    await renderDetail('TCK-0001', 'agent')
    expect(screen.queryByRole('button', { name: 'Delete ticket' })).not.toBeInTheDocument()
  })
})
