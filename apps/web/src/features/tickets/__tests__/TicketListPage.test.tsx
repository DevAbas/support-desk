import { screen, waitForElementToBeRemoved, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { forwardToApi, mswServer } from '@/test/msw/server'
import { renderWithProviders } from '@/test/renderWithProviders'
import { TicketListPage } from '@/features/tickets/TicketListPage'

async function renderList(role: 'agent' | 'admin') {
  renderWithProviders(<TicketListPage />, { role, initialEntries: ['/tickets'] })
  await waitForElementToBeRemoved(() => screen.queryByText('Loading tickets…'))
}

describe('TicketListPage', () => {
  it('shows a loading state and then a page of tickets', async () => {
    renderWithProviders(<TicketListPage />, { initialEntries: ['/tickets'] })

    expect(screen.getByText('Loading tickets…')).toBeInTheDocument()

    await waitForElementToBeRemoved(() => screen.queryByText('Loading tickets…'))

    // Ten data rows plus the header row.
    expect(screen.getAllByRole('row')).toHaveLength(11)
    expect(screen.getByText('Showing 1–10 of 40')).toBeInTheDocument()
  })

  it('shows the empty state when no ticket matches the search', async () => {
    await renderList('agent')

    await userEvent.type(screen.getByLabelText('Search'), 'zzzzzz')

    expect(await screen.findByText('No tickets match these filters.')).toBeInTheDocument()
    expect(screen.getByText('No tickets')).toBeInTheDocument()
  })

  it('does not offer selection or bulk actions to an agent', async () => {
    await renderList('agent')

    expect(screen.queryByLabelText('Select all tickets on this page')).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Bulk actions' })).not.toBeInTheDocument()
  })

  it('reveals bulk actions to an admin once rows are selected', async () => {
    await renderList('admin')

    const selectAll = screen.getByLabelText('Select all tickets on this page')
    expect(screen.queryByRole('group', { name: 'Bulk actions' })).not.toBeInTheDocument()

    await userEvent.click(selectAll)

    expect(screen.getByRole('group', { name: 'Bulk actions' })).toBeInTheDocument()
    expect(screen.getByText('10 tickets selected')).toBeInTheDocument()
  })

  it('pages through the queue', async () => {
    await renderList('agent')

    await userEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(await screen.findByText('Showing 11–20 of 40')).toBeInTheDocument()
  })

  it('keeps the page on screen while the next filter loads', async () => {
    await renderList('agent')

    // Slow enough that the assertion lands while the request is still open.
    mswServer.use(
      http.get('/api/tickets', async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
        return HttpResponse.json({ rows: [], total: 0, page: 1, pageCount: 1 })
      }),
    )

    await userEvent.selectOptions(screen.getByLabelText('Status'), 'open')

    // Still the previous page, rather than a spinner or an empty table.
    expect(screen.queryByText('Loading tickets…')).not.toBeInTheDocument()
    expect(screen.getByText('Showing 1–10 of 40')).toBeInTheDocument()

    expect(await screen.findByText('No tickets')).toBeInTheDocument()
  })

  it('reports a failed load and retries it from Try again', async () => {
    mswServer.use(http.get('/api/tickets', () => HttpResponse.error()))

    renderWithProviders(<TicketListPage />, { initialEntries: ['/tickets'] })

    expect(await screen.findByText('Could not reach the server.')).toBeInTheDocument()

    // Put the real API back, then use the affordance the error offers.
    mswServer.resetHandlers()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Showing 1–10 of 40')).toBeInTheDocument()
    expect(screen.queryByText('Could not reach the server.')).not.toBeInTheDocument()
  })

  it('applies a bulk move and shows the updated rows', async () => {
    await renderList('admin')

    // Thirteen resolved tickets, so closing the ten on this page leaves three.
    // Close carries no conditions, so every row on the page can take it.
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'resolved')
    await screen.findByText('Showing 1–10 of 13')

    await userEvent.click(screen.getByLabelText('Select all tickets on this page'))
    await userEvent.selectOptions(screen.getByLabelText('Move'), 'close')
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))

    // The rows that were on screen are no longer resolved, so the list the
    // mutation invalidated comes back shorter.
    expect(await screen.findByText('Showing 1–3 of 3')).toBeInTheDocument()
    expect(await screen.findByText('10 tickets moved.')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Bulk actions' })).not.toBeInTheDocument()
  })

  it('moves what it can, leaves the rest ticked, and says which condition failed', async () => {
    await renderList('admin')

    // Eleven pending tickets. Ten are on this page and three of those are
    // unassigned, so Resolve applies to seven of the selection and not to the
    // other three — which is the mixed selection a bulk bar has to answer for.
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'pending')
    await screen.findByText('Showing 1–10 of 11')

    await userEvent.click(screen.getByLabelText('Select all tickets on this page'))
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))

    expect(await screen.findByText('7 tickets moved. 3 were left where they were.'))
      .toBeInTheDocument()
    expect(
      screen.getByText(/A ticket needs an owner before it can be worked/),
    ).toBeInTheDocument()

    // The three that could not move are still ticked, because they are the ones
    // that still need something doing to them.
    expect(await screen.findByText('3 tickets selected')).toBeInTheDocument()
  })

  it('asks why before a move that takes tickets backwards', async () => {
    await renderList('admin')

    await userEvent.selectOptions(screen.getByLabelText('Status'), 'resolved')
    await screen.findByText('Showing 1–10 of 13')

    await userEvent.click(screen.getByLabelText('Select all tickets on this page'))
    await userEvent.selectOptions(screen.getByLabelText('Move'), 'reject')
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))

    // Nothing has moved yet: the dialog is the move, and it has not been
    // answered.
    const dialog = await screen.findByRole('dialog', { name: 'Not fixed' })
    expect(screen.getByText('Showing 1–10 of 13')).toBeInTheDocument()

    await userEvent.type(within(dialog).getByLabelText('Why'), 'Customer says it is back.')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Not fixed' }))

    expect(await screen.findByText('10 tickets moved.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('drops only the tickets the apply acted on, and puts the move back', async () => {
    // Held open so a row can be ticked while the request is in flight, which is
    // the only sequence that tells "drop what was applied" apart from "clear
    // everything".
    let release = () => undefined as void
    const held = new Promise<void>((resolve) => {
      release = resolve
    })

    mswServer.use(
      http.post('/api/tickets/bulk/moves', async ({ request }) => {
        await held
        return forwardToApi(request)
      }),
    )

    await renderList('admin')

    // Filtered, so one move applies to every row that is ticked: which tickets
    // a move reaches is the next test's subject and would only obscure this one.
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'resolved')
    await screen.findByText('Showing 1–10 of 13')

    const [applied, alsoApplied, tickedMeanwhile] = screen
      .getAllByRole('checkbox', { name: /^Select ticket/ })
      .map((box) => box.getAttribute('aria-label') ?? '')

    await userEvent.click(screen.getByRole('checkbox', { name: applied }))
    await userEvent.click(screen.getByRole('checkbox', { name: alsoApplied }))

    await userEvent.selectOptions(screen.getByLabelText('Move'), 'close')
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))

    // Ticked after the request went out, so it was not part of what was done.
    await userEvent.click(screen.getByRole('checkbox', { name: tickedMeanwhile }))
    expect(screen.getByText('3 tickets selected')).toBeInTheDocument()

    release()

    expect(await screen.findByText('1 ticket selected')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: tickedMeanwhile })).toBeChecked()
    expect(screen.queryByRole('checkbox', { name: applied })).not.toBeInTheDocument()

    // And the select is back on the move a bulk edit opens on, rather than
    // holding the one that has already been applied.
    expect(screen.getByLabelText('Move')).toHaveValue('resolve')
  })

  describe('CSV export', () => {
    // jsdom has no object URLs and does not follow a download, so the two edges
    // of downloadTextFile() are stubbed and the blob it was handed is read back.
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:tickets')
    const revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click')
    const original = { createObjectURL: URL.createObjectURL, revokeObjectURL: URL.revokeObjectURL }

    beforeAll(() => {
      Object.assign(URL, { createObjectURL, revokeObjectURL })
      click.mockImplementation(() => {})
    })

    afterAll(() => {
      Object.assign(URL, original)
      click.mockRestore()
    })

    beforeEach(() => {
      createObjectURL.mockClear()
      revokeObjectURL.mockClear()
      click.mockClear()
    })

    async function downloadedCsv(): Promise<string> {
      const [blob] = createObjectURL.mock.calls[0]
      return blob.text()
    }

    it('exports every ticket the filters match, not just the page on screen', async () => {
      await renderList('agent')

      await userEvent.click(screen.getByRole('button', { name: 'Export CSV' }))

      await vi.waitFor(() => expect(click).toHaveBeenCalledOnce())

      const csv = await downloadedCsv()

      // A header row and all 40 tickets, while only 10 are on screen.
      expect(csv.split('\r\n')).toHaveLength(41)
      expect(csv.startsWith('"Ticket","Title","Status","Priority","Assignee","Created"')).toBe(true)
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:tickets')
    })

    it('narrows the export to the current filters', async () => {
      await renderList('agent')

      await userEvent.selectOptions(screen.getByLabelText('Status'), 'resolved')
      await screen.findByText(/^Showing \d+–\d+ of \d+$/)

      await userEvent.click(screen.getByRole('button', { name: 'Export CSV' }))
      await vi.waitFor(() => expect(click).toHaveBeenCalledOnce())

      const dataRows = (await downloadedCsv()).split('\r\n').slice(1)

      expect(dataRows.length).toBeGreaterThan(0)
      expect(dataRows.length).toBeLessThan(40)
      expect(dataRows.every((row) => row.includes('"Resolved"'))).toBe(true)
    })

    it('offers nothing to export when no ticket matches', async () => {
      await renderList('agent')

      await userEvent.type(screen.getByLabelText('Search'), 'zzzzzz')
      await screen.findByText('No tickets match these filters.')

      expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled()
    })
  })
})
