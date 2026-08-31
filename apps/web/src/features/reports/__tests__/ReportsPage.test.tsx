import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { mswServer } from '@/test/msw/server'
import { renderWithProviders } from '@/test/renderWithProviders'
import { ReportsPage } from '@/features/reports/ReportsPage'

/**
 * The screen is driven against the real API through MSW, like every other
 * feature test here.
 *
 * The range is set explicitly rather than left on its default, because the
 * default is relative to today and the seeded queue is not: a test asserting on
 * "this quarter" would start failing on its own in October.
 */
async function renderReports() {
  // As an admin, because only an admin reaches this screen: the nav does not
  // offer it to an agent, the route guard turns them away, and the API refuses
  // all three requests behind it.
  renderWithProviders(<ReportsPage />, { initialEntries: ['/reports'], role: 'admin' })

  return await screen.findByRole('table', { name: 'Tickets by status' })
}

/** July holds 21 of the 40 seeded tickets. */
async function selectJuly() {
  fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-07-01' } })
  fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-07-31' } })

  await screen.findByText('21 tickets raised between 1 Jul 2026 and 31 Jul 2026.')
}

function chartRow(table: HTMLElement, label: string): string {
  const cell = within(table).getByRole('cell', { name: label })
  const value = cell.parentElement?.lastElementChild?.textContent

  return value ?? ''
}

describe('ReportsPage', () => {
  it('shows the four headline figures for the range', async () => {
    await renderReports()
    await selectJuly()

    const summary = screen.getByRole('region', { name: 'Summary' })

    expect(within(summary).getByText('Tickets raised')).toBeInTheDocument()
    expect(within(summary).getByText('Resolved')).toBeInTheDocument()
    expect(within(summary).getByText('Median time to resolution')).toBeInTheDocument()
    expect(within(summary).getByText('Currently open')).toBeInTheDocument()

    // Counted by the server: 21 raised in July, 9 of them since resolved.
    expect(within(summary).getByText('21')).toBeInTheDocument()
    expect(within(summary).getByText('9')).toBeInTheDocument()
  })

  it('compares the range with the period before it', async () => {
    await renderReports()
    await selectJuly()

    // The 31 days before July hold 19 tickets, so 21 is up a tenth on them.
    expect(await screen.findByText('+11%')).toBeInTheDocument()
    expect(screen.getAllByText('vs previous 31 days').length).toBeGreaterThan(0)
  })

  it('breaks the range down by status, keeping the empty buckets', async () => {
    await renderReports()
    await selectJuly()

    const table = await screen.findByRole('table', { name: 'Tickets by status' })

    expect(chartRow(table, 'Open')).toBe('6')
    expect(chartRow(table, 'Pending')).toBe('6')
    expect(chartRow(table, 'Resolved')).toBe('6')
    expect(chartRow(table, 'Closed')).toBe('3')
  })

  it('switches to the same range by priority', async () => {
    await renderReports()
    await selectJuly()

    await userEvent.click(screen.getByRole('tab', { name: 'By priority' }))

    const table = await screen.findByRole('table', { name: 'Tickets by priority' })

    expect(chartRow(table, 'Low')).toBe('3')
    expect(chartRow(table, 'Medium')).toBe('13')
    expect(chartRow(table, 'High')).toBe('5')
    expect(screen.queryByRole('table', { name: 'Tickets by status' })).not.toBeInTheDocument()
  })

  it('switches to a table of assignees, busiest first', async () => {
    await renderReports()
    await selectJuly()

    await userEvent.click(screen.getByRole('tab', { name: 'By assignee' }))

    const table = await screen.findByRole('table', { name: 'Tickets by assignee' })
    const rows = within(table).getAllByRole('row').slice(1)

    expect(rows[0]).toHaveTextContent('Unassigned')
    expect(rows[1]).toHaveTextContent('Marco Ellis')
    expect(rows).toHaveLength(5)
  })

  it('reports an empty range rather than an empty chart', async () => {
    await renderReports()

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-01-01' } })
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-01-31' } })

    expect(await screen.findByText('No tickets were raised in this range.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeDisabled()
  })

  it('reports a failed load and retries it from Try again', async () => {
    mswServer.use(http.get('/api/reports/summary', () => HttpResponse.error()))

    renderWithProviders(<ReportsPage />, { initialEntries: ['/reports'] })

    expect(await screen.findByText('Could not load the summary')).toBeInTheDocument()

    mswServer.resetHandlers()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('region', { name: 'Summary' })).toBeInTheDocument()
    expect(screen.queryByText('Could not load the summary')).not.toBeInTheDocument()
  })

  describe('CSV export', () => {
    // jsdom has no object URLs and does not follow a download, so the two edges
    // of downloadTextFile() are stubbed and the blob it was handed is read back.
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:report')
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
      click.mockClear()
    })

    async function downloadedCsv(): Promise<string> {
      const [blob] = createObjectURL.mock.calls[0]
      return blob.text()
    }

    it('exports the view on screen', async () => {
      await renderReports()
      await selectJuly()

      await userEvent.click(screen.getByRole('button', { name: 'Export CSV' }))
      await vi.waitFor(() => expect(click).toHaveBeenCalledOnce())

      const csv = await downloadedCsv()

      expect(csv.split('\r\n')[0]).toBe('"Status","Tickets","Share"')
      expect(csv).toContain('"Closed","3"')
    })

    it('exports the assignee view when that is the one showing', async () => {
      await renderReports()
      await selectJuly()

      await userEvent.click(screen.getByRole('tab', { name: 'By assignee' }))
      await screen.findByRole('table', { name: 'Tickets by assignee' })

      await userEvent.click(screen.getByRole('button', { name: 'Export CSV' }))
      await vi.waitFor(() => expect(click).toHaveBeenCalledOnce())

      const csv = await downloadedCsv()

      expect(csv.split('\r\n')[0]).toBe('"Assignee","Open","Pending","Resolved","Closed","Total"')
      expect(csv).toContain('"Unassigned"')
    })
  })
})
