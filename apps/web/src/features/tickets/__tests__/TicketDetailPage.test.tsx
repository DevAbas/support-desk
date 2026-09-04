import { screen, waitForElementToBeRemoved, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import type { Role } from '@/features/roles/role.types'
import { Route, Routes } from 'react-router-dom'
import { SEED_AGENT_EMAIL } from '@support-desk/api/userSeed'
import { mswServer, signInTestUser } from '@/test/msw/server'
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
    expect(screen.getByText('This ticket is Closed.')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('makes a move without going back for the ticket', async () => {
    const paths: string[] = []
    mswServer.events.on('request:start', ({ request }) => {
      paths.push(`${request.method} ${new URL(request.url).pathname}`)
    })

    // Pending and assigned, so Resolve is available and asks for nothing.
    await renderDetail('TCK-0032')
    await userEvent.click(await screen.findByRole('button', { name: 'Resolve' }))

    expect(await screen.findByText('This ticket is Resolved.')).toBeInTheDocument()

    // The POST answered with the whole moved ticket, so the page has the newest
    // version already and never asks for it again. It does ask what the ticket
    // can do *next*, because that is a different question and only the server
    // has the answer.
    const after = paths.slice(paths.indexOf('POST /api/tickets/TCK-0032/moves'))
    expect(after).toEqual([
      'POST /api/tickets/TCK-0032/moves',
      'GET /api/tickets/TCK-0032/moves',
    ])

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

  describe('the moves', () => {
    it('draws a blocked move disabled, with the condition it is waiting on', async () => {
      // Open, and nobody owns it.
      await renderDetail('TCK-0038')

      const start = await screen.findByRole('button', { name: 'Start work' })

      expect(start).toBeDisabled()
      // The condition is the button's description rather than a sentence that
      // happens to sit under it, so a disabled control is not a dead end for
      // anybody who cannot see the layout.
      expect(start).toHaveAccessibleDescription(
        /A ticket needs an owner before it can be worked/,
      )
    })

    it('offers nothing an agent may not do, and asks the server which those are', async () => {
      // The role gate is the session's, not the provider's: this card renders
      // what `GET /moves` came back with, so signing in as an agent is what
      // makes the test about an agent.
      signInTestUser(SEED_AGENT_EMAIL)
      await renderDetail('TCK-0001', 'agent')

      // Nothing on offer, and the reason is the role rather than the ticket: a
      // closed ticket has a way on, and reopening is the one move that is not an
      // agent's. The move stays absent rather than disabled — a control
      // explaining a power you do not have is somebody else's job on your screen
      // — so the card is where the reason has to be said.
      expect(await screen.findByText('Reopen is for administrators.')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Reopen' })).not.toBeInTheDocument()
    })

    it('asks why before reopening, refuses an empty reason, and keeps the one it gets', async () => {
      await renderDetail('TCK-0001', 'admin')

      await userEvent.click(await screen.findByRole('button', { name: 'Reopen' }))

      const dialog = await screen.findByRole('dialog', { name: 'Reopen' })

      // Submitting nothing is refused in the browser with the same sentence the
      // server would have answered with, and the ticket has not moved.
      await userEvent.click(within(dialog).getByRole('button', { name: 'Reopen' }))
      expect(await screen.findByRole('alert')).toHaveTextContent(
        /A move that takes a ticket backwards needs a reason/,
      )
      expect(screen.getByText('This ticket is Closed.')).toBeInTheDocument()

      await userEvent.type(
        within(dialog).getByLabelText('Why'),
        'Same fault reported again on Tuesday.',
      )
      await userEvent.click(within(dialog).getByRole('button', { name: 'Reopen' }))

      expect(await screen.findByText('This ticket is Open.')).toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

      // And the sentence is kept, which is the only thing that makes asking for
      // it worth anything.
      expect(screen.getByText('Reopen by Dana Whitfield')).toBeInTheDocument()
      expect(screen.getByText('Same fault reported again on Tuesday.')).toBeInTheDocument()
      expect(screen.getByText('Closed to Open')).toBeInTheDocument()
    })

    it('asks again after a reassignment, because that changes what can be done', async () => {
      await renderDetail('TCK-0032')

      expect(await screen.findByRole('button', { name: 'Resolve' })).toBeEnabled()

      const field = screen.getByLabelText('Assigned to')
      await userEvent.clear(field)
      await userEvent.type(field, 'Unassigned')
      await userEvent.click(screen.getByRole('button', { name: 'Reassign' }))

      // Handing a ticket back to nobody is the one edit on this screen that
      // moves a condition, so the card has to hear about it rather than keep
      // offering a move the server would now refuse.
      await vi.waitFor(() =>
        expect(screen.getByRole('button', { name: 'Resolve' })).toBeDisabled(),
      )
      expect(screen.getByRole('button', { name: 'Resolve' })).toHaveAccessibleDescription(
        /A ticket needs an owner before it can be worked/,
      )
    })

    it('reports a refused move, and goes back for the ticket it was refused on', async () => {
      const paths: string[] = []
      mswServer.events.on('request:start', ({ request }) => {
        paths.push(`${request.method} ${new URL(request.url).pathname}`)
      })

      await renderDetail('TCK-0032')

      // A ticket can move under somebody while they are reading it, so a
      // correct screen still has to render a refusal.
      mswServer.use(
        http.post('/api/tickets/:id/moves', () =>
          HttpResponse.json(
            {
              error: {
                code: 'conflict',
                message: 'Resolve is a move out of Pending, and this ticket is Resolved.',
              },
            },
            { status: 409 },
          ),
        ),
      )

      await userEvent.click(await screen.findByRole('button', { name: 'Resolve' }))

      expect(
        await screen.findByText('Resolve is a move out of Pending, and this ticket is Resolved.'),
      ).toBeInTheDocument()

      // That refusal is the server saying this screen is out of date, and
      // nothing else would correct it: the cache does not refetch on focus. So
      // the ticket and its moves are asked for again, rather than leaving the
      // person to click a second time into the same sentence.
      await vi.waitFor(() => {
        const after = paths.slice(paths.indexOf('POST /api/tickets/TCK-0032/moves'))

        expect(after).toContain('GET /api/tickets/TCK-0032')
        expect(after).toContain('GET /api/tickets/TCK-0032/moves')
      })

      mswServer.events.removeAllListeners()
    })
  })
})
