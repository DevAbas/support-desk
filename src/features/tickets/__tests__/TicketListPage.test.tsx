import { screen, waitForElementToBeRemoved } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetTickets } from '../../../lib/api'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { TicketListPage } from '../TicketListPage'

async function renderList(role: 'agent' | 'admin') {
  renderWithProviders(<TicketListPage />, { role, initialEntries: ['/tickets'] })
  await waitForElementToBeRemoved(() => screen.queryByText('Loading tickets…'))
}

describe('TicketListPage', () => {
  beforeEach(() => {
    resetTickets()
  })

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
