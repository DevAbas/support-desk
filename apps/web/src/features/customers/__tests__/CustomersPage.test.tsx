import { screen, waitFor, waitForElementToBeRemoved, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { forwardToApi, mswServer } from '@/test/msw/server'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { Role } from '@/features/roles/role.types'
import { CustomersPage } from '@/features/customers/CustomersPage'

/**
 * The screen is driven against the real API through MSW, the same way the ticket
 * screens are, so what is asserted here is the real cursor paging and the real
 * plan filtering rather than a fixture agreeing with itself.
 *
 * The seed holds sixty customers, ten of whom have raised something.
 */
async function renderCustomers(role: Role = 'agent') {
  renderWithProviders(<CustomersPage />, { initialEntries: ['/customers'], role })
  await waitForElementToBeRemoved(() => screen.queryByText('Loading customers…'))
}

/** The rows of the list itself, not of the ticket list inside the drawer. */
function customerRows(): HTMLElement[] {
  return within(screen.getByRole('list', { name: 'Customers' })).getAllByRole('listitem')
}

const loadMore = () => screen.getByRole('button', { name: 'Load more customers' })

describe('CustomersPage', () => {
  it('shows a loading state and then the first page of customers', async () => {
    renderWithProviders(<CustomersPage />, { initialEntries: ['/customers'] })

    expect(screen.getByText('Loading customers…')).toBeInTheDocument()

    await waitForElementToBeRemoved(() => screen.queryByText('Loading customers…'))

    expect(customerRows()).toHaveLength(20)
    // The whole list it matched, against what has been loaded of it so far.
    expect(screen.getByText('Showing 20 of 60')).toBeInTheDocument()
  })

  it('appends the next page rather than replacing the list', async () => {
    await renderCustomers()

    const first = customerRows()[0]
    expect(first).toBeDefined()

    await userEvent.click(loadMore())

    expect(await screen.findByText('Showing 40 of 60')).toBeInTheDocument()
    expect(customerRows()).toHaveLength(40)
    // The row that was at the top is still at the top: this list grows, where
    // the ticket table turns.
    expect(customerRows()[0]).toBe(first)
  })

  it('stops offering more once the whole list is loaded', async () => {
    await renderCustomers()

    await userEvent.click(loadMore())
    await screen.findByText('Showing 40 of 60')

    await userEvent.click(loadMore())
    expect(await screen.findByText('Showing 60 of 60')).toBeInTheDocument()

    expect(screen.queryByRole('button', { name: 'Load more customers' })).not.toBeInTheDocument()
  })

  it('filters on several plans at once', async () => {
    await renderCustomers()

    await userEvent.click(screen.getByRole('button', { name: 'Plan All plans' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Enterprise' }))

    expect(await screen.findByText('Showing 5 of 5')).toBeInTheDocument()

    // A second plan widens the filter rather than replacing it — the thing a
    // single-value select cannot do.
    await userEvent.click(screen.getByRole('checkbox', { name: 'Pro' }))

    expect(await screen.findByText('Showing 14 of 14')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Plan 2 selected' })).toBeInTheDocument()
  })

  it('searches over name, company and email', async () => {
    await renderCustomers()

    await userEvent.type(screen.getByLabelText('Search'), 'northwind')

    expect(await screen.findByText('Showing 3 of 3')).toBeInTheDocument()
    expect(customerRows()).toHaveLength(3)
  })

  it('shows the empty state when nothing matches', async () => {
    await renderCustomers()

    await userEvent.type(screen.getByLabelText('Search'), 'zzzzzz')

    expect(await screen.findByText('No customers match these filters.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Load more customers' })).not.toBeInTheDocument()
  })

  it('opens a customer in a drawer over the list, without leaving it', async () => {
    await renderCustomers()

    await userEvent.click(screen.getByRole('button', { name: /Priya Raman/ }))

    const drawer = await screen.findByRole('dialog', { name: 'Priya Raman' })

    expect(within(drawer).getByText('Northwind Labs')).toBeInTheDocument()
    expect(within(drawer).getByRole('link', { name: 'priya.raman@northwindlabs.example' }))
      .toHaveAttribute('href', 'mailto:priya.raman@northwindlabs.example')

    // The list is still there underneath, and still says what it was showing.
    expect(screen.getByRole('list', { name: 'Customers' })).toBeInTheDocument()
    expect(screen.getByText('Showing 20 of 60')).toBeInTheDocument()
  })

  it('marks the row whose drawer is open', async () => {
    await renderCustomers()

    const row = screen.getByRole('button', { name: /Priya Raman/ })
    expect(row).not.toHaveAttribute('aria-current')

    await userEvent.click(row)
    await screen.findByRole('dialog', { name: 'Priya Raman' })

    expect(screen.getByRole('button', { name: /Priya Raman/ })).toHaveAttribute(
      'aria-current',
      'true',
    )
  })

  it('lists the tickets the customer raised, linked to the ticket screens', async () => {
    await renderCustomers()

    await userEvent.click(screen.getByRole('button', { name: /Priya Raman/ }))

    const drawer = await screen.findByRole('dialog', { name: 'Priya Raman' })
    const tickets = within(drawer).getByRole('list', { name: 'Tickets raised by Priya Raman' })

    expect(within(tickets).getAllByRole('listitem')).toHaveLength(8)
    expect(within(drawer).getByRole('link', { name: 'SSO login loops back to the sign-in page' }))
      .toHaveAttribute('href', '/tickets/TCK-0028')
  })

  it('says so when a customer has raised nothing', async () => {
    await renderCustomers()

    await userEvent.click(screen.getByRole('button', { name: /Elena Harper/ }))

    const drawer = await screen.findByRole('dialog', { name: 'Elena Harper' })

    expect(within(drawer).getByText('No tickets raised yet.')).toBeInTheDocument()
  })

  it('closes the drawer on Escape and puts focus back on the row', async () => {
    await renderCustomers()

    const row = screen.getByRole('button', { name: /Priya Raman/ })
    await userEvent.click(row)
    await screen.findByRole('dialog', { name: 'Priya Raman' })

    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Priya Raman/ })).toHaveFocus()
  })

  it('reports a failed load and retries it from Try again', async () => {
    mswServer.use(http.get('/api/customers', () => HttpResponse.error()))

    renderWithProviders(<CustomersPage />, { initialEntries: ['/customers'] })

    expect(await screen.findByText('Could not reach the server.')).toBeInTheDocument()

    mswServer.resetHandlers()

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Showing 20 of 60')).toBeInTheDocument()
  })

  it('reports a failed customer without taking the list down with it', async () => {
    await renderCustomers()

    mswServer.use(http.get('/api/customers/:id', () => HttpResponse.error()))

    await userEvent.click(screen.getByRole('button', { name: /Priya Raman/ }))

    expect(await screen.findByText('Could not reach the server.')).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(customerRows()).toHaveLength(20)
  })
  describe('CSV export', () => {
    // jsdom has no object URLs and does not follow a download, so the two edges
    // of downloadTextFile() are stubbed and the blob it was handed is read back.
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:customers')
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

    const exportCsv = () => screen.getByRole('button', { name: 'Export CSV' })

    async function downloadedCsv(): Promise<string> {
      await vi.waitFor(() => expect(click).toHaveBeenCalledOnce())

      const [blob] = createObjectURL.mock.calls[0]
      return blob.text()
    }

    it('exports every customer the filters match, not just the pages on screen', async () => {
      await renderCustomers()

      await userEvent.click(exportCsv())

      const csv = await downloadedCsv()

      // A header row and all 60 customers, while only 20 are on screen.
      expect(csv.split('\r\n')).toHaveLength(61)
      expect(csv.startsWith('"Name","Company","Email","Plan","Tickets","Signed up"')).toBe(true)
      expect(screen.getByText('Showing 20 of 60')).toBeInTheDocument()
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:customers')
    })

    it('narrows the export to the current filters', async () => {
      await renderCustomers()

      await userEvent.click(screen.getByRole('button', { name: 'Plan All plans' }))
      await userEvent.click(screen.getByRole('checkbox', { name: 'Enterprise' }))
      await screen.findByText('Showing 5 of 5')

      await userEvent.click(exportCsv())

      const dataRows = (await downloadedCsv()).split('\r\n').slice(1)

      expect(dataRows).toHaveLength(5)
      expect(dataRows.every((row) => row.includes('"Enterprise"'))).toBe(true)
    })

    it('walks the cursor to the end when the list is longer than one page', async () => {
      // The export asks for the largest page the endpoint serves, and the seed
      // fits inside one. Capping only the export's requests — the list is asking
      // for twenty and is left alone — makes the walk the seed cannot force.
      const pageSizes: number[] = []

      mswServer.use(
        http.get('/api/customers', ({ request }) => {
          const url = new URL(request.url)
          const limit = Number(url.searchParams.get('limit'))

          if (limit > 25) {
            pageSizes.push(limit)
            url.searchParams.set('limit', '25')
          }

          return forwardToApi(new Request(url, request))
        }),
      )

      await renderCustomers()
      await userEvent.click(exportCsv())

      const csv = await downloadedCsv()

      // Still every customer, in three requests of twenty-five rather than one.
      expect(csv.split('\r\n')).toHaveLength(61)
      expect(pageSizes).toHaveLength(3)
    })

    it('offers nothing to export when no customer matches', async () => {
      await renderCustomers()

      await userEvent.type(screen.getByLabelText('Search'), 'zzzzzz')
      await screen.findByText('No customers match these filters.')

      expect(exportCsv()).toBeDisabled()
    })

    it('reports a failed export without taking the list down with it', async () => {
      await renderCustomers()

      mswServer.use(http.get('/api/customers', () => HttpResponse.error()))

      await userEvent.click(exportCsv())

      expect(await screen.findByText('Could not reach the server.')).toBeInTheDocument()
      expect(click).not.toHaveBeenCalled()
      expect(customerRows()).toHaveLength(20)
    })
  })
})

/**
 * The bulk actions, driven against the real API the same way the rest of this
 * file is: what is asserted is a plan actually changed and a row actually gone,
 * not a mutation function having been called.
 *
 * The seed puts Elena Harper and Priya Raman on Free and Clara Lindberg on Pro,
 * all three on the first page.
 */
const bulkBar = () => screen.getByRole('group', { name: 'Bulk actions' })

const queryBulkBar = () => screen.queryByRole('group', { name: 'Bulk actions' })

function tick(name: string): Promise<void> {
  return userEvent.click(screen.getByRole('checkbox', { name: `Select ${name}` }))
}

/** The list row a person is on, found by what is written on it. */
function rowFor(name: string): HTMLElement {
  const row = customerRows().find((item) => item.textContent?.includes(name) === true)

  if (!row) {
    throw new Error(`No row for ${name}.`)
  }

  return row
}

describe('CustomersPage bulk actions', () => {
  it('offers an agent no selection at all', async () => {
    await renderCustomers()

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(queryBulkBar()).not.toBeInTheDocument()
  })

  it('shows the bar to an admin once a row is ticked', async () => {
    await renderCustomers('admin')

    // Twenty checkboxes and no bar: there is nothing to act on yet.
    expect(screen.getAllByRole('checkbox')).toHaveLength(20)
    expect(queryBulkBar()).not.toBeInTheDocument()

    await tick('Elena Harper')
    expect(within(bulkBar()).getByText('1 customer selected')).toBeInTheDocument()

    await tick('Priya Raman')
    expect(within(bulkBar()).getByText('2 customers selected')).toBeInTheDocument()

    await tick('Elena Harper')
    expect(within(bulkBar()).getByText('1 customer selected')).toBeInTheDocument()
  })

  it('ticks a row without opening it', async () => {
    await renderCustomers('admin')

    await tick('Priya Raman')

    // The checkbox is beside the row control rather than inside it, so the two
    // are separate: one selects, the other opens.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Priya Raman/ })).not.toHaveAttribute('aria-current')
  })

  it('will not apply a plan until one is named', async () => {
    await renderCustomers('admin')
    await tick('Elena Harper')

    // The select opens on its placeholder: a default here is one click away
    // from moving an account onto a plan nobody asked for.
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled()

    await userEvent.selectOptions(screen.getByLabelText('Set plan to'), 'pro')
    expect(screen.getByRole('button', { name: 'Apply' })).toBeEnabled()
  })

  it('moves every ticked customer onto the plan, and nobody else', async () => {
    await renderCustomers('admin')

    await tick('Elena Harper')
    await tick('Priya Raman')

    await userEvent.selectOptions(screen.getByLabelText('Set plan to'), 'enterprise')
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))

    await waitFor(() => {
      expect(within(rowFor('Elena Harper')).getByText('Enterprise')).toBeInTheDocument()
    })
    expect(within(rowFor('Priya Raman')).getByText('Enterprise')).toBeInTheDocument()
    expect(within(rowFor('Clara Lindberg')).getByText('Pro')).toBeInTheDocument()

    // The bar goes with the selection it was acting on.
    expect(queryBulkBar()).not.toBeInTheDocument()
  })

  it('selects everything loaded, and keeps counting as more arrives', async () => {
    await renderCustomers('admin')
    await tick('Elena Harper')

    await userEvent.click(screen.getByRole('button', { name: 'Select all 20' }))

    expect(within(bulkBar()).getByText('20 customers selected')).toBeInTheDocument()
    // Nothing left to select, so the control that would do it is gone.
    expect(screen.queryByRole('button', { name: /^Select all/ })).not.toBeInTheDocument()

    await userEvent.click(loadMore())
    expect(await screen.findByText('Showing 40 of 60')).toBeInTheDocument()

    // The twenty stay ticked — this list grows rather than turns — and "all"
    // now means the forty that are loaded.
    expect(within(bulkBar()).getByText('20 customers selected')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Select all 40' })).toBeInTheDocument()
  })

  it('drops a selected row from the count when a filter stops matching it', async () => {
    await renderCustomers('admin')

    await tick('Elena Harper')
    await userEvent.type(screen.getByLabelText('Search'), 'northwind')

    // Derived from the rows on screen rather than stored, so a row the filters
    // hide stops counting without an effect having to reset anything.
    expect(await screen.findByText('Showing 3 of 3')).toBeInTheDocument()
    expect(queryBulkBar()).not.toBeInTheDocument()
  })

  it('clears the selection', async () => {
    await renderCustomers('admin')

    await tick('Elena Harper')
    await userEvent.click(screen.getByRole('button', { name: 'Clear selection' }))

    expect(queryBulkBar()).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Select Elena Harper' })).not.toBeChecked()
  })

  it('deletes the selection behind a confirmation', async () => {
    await renderCustomers('admin')

    await tick('Elena Harper')
    await userEvent.click(screen.getByRole('button', { name: 'Delete selected' }))

    const dialog = await screen.findByRole('dialog', { name: 'Delete selected customers' })
    expect(within(dialog).getByText(/permanently removes 1 customer/)).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete customers' }))

    // Fifty-nine left, and the first page refills to twenty out of them.
    expect(await screen.findByText('Showing 20 of 59')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Select Elena Harper' })).not.toBeInTheDocument()
    expect(queryBulkBar()).not.toBeInTheDocument()
  })

  it('deletes nobody when the confirmation is cancelled', async () => {
    await renderCustomers('admin')

    await tick('Elena Harper')
    await userEvent.click(screen.getByRole('button', { name: 'Delete selected' }))

    const dialog = await screen.findByRole('dialog', { name: 'Delete selected customers' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    expect(screen.getByText('Showing 20 of 60')).toBeInTheDocument()
    // Still ticked: cancelling a question is not undoing the work behind it.
    expect(within(bulkBar()).getByText('1 customer selected')).toBeInTheDocument()
  })

  it('leaves the tickets of a deleted customer in the queue', async () => {
    await renderCustomers('admin')

    // Priya has raised eight. The link runs from a customer to ticket ids and
    // not back, so deleting her takes the link and leaves the history.
    await tick('Priya Raman')
    await userEvent.click(screen.getByRole('button', { name: 'Delete selected' }))

    const dialog = await screen.findByRole('dialog', { name: 'Delete selected customers' })
    expect(within(dialog).getByText(/tickets they raised stay in the queue/)).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete customers' }))
    await screen.findByText('Showing 20 of 59')

    const response = await forwardToApi(new Request('http://localhost/api/tickets/TCK-0028'))
    expect(response.status).toBe(200)
  })

  it('reports a failed bulk action and keeps the selection', async () => {
    mswServer.use(http.patch('/api/customers/bulk', () => HttpResponse.error()))

    await renderCustomers('admin')
    await tick('Elena Harper')

    await userEvent.selectOptions(screen.getByLabelText('Set plan to'), 'pro')
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))

    expect(await screen.findByText('Could not reach the server.')).toBeInTheDocument()
    // Nothing was applied, so there is still a selection to try again with.
    expect(within(bulkBar()).getByText('1 customer selected')).toBeInTheDocument()
    expect(within(rowFor('Elena Harper')).getByText('Free')).toBeInTheDocument()
  })

  it('closes the drawer when the customer it is showing is deleted', async () => {
    // The delete is held open, because that is the only sequence that reaches
    // this: Escape dismisses the confirmation while the request is in flight,
    // which puts the list — and so the drawer — back within reach.
    let release = () => undefined as void
    const held = new Promise<void>((resolve) => {
      release = resolve
    })

    mswServer.use(
      http.delete('/api/customers/bulk', async ({ request }) => {
        await held
        return forwardToApi(request)
      }),
    )

    await renderCustomers('admin')

    await tick('Priya Raman')
    await userEvent.click(screen.getByRole('button', { name: 'Delete selected' }))

    const dialog = await screen.findByRole('dialog', { name: 'Delete selected customers' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete customers' }))

    await userEvent.keyboard('{Escape}')
    await userEvent.click(screen.getByRole('button', { name: /Priya Raman/ }))
    expect(await screen.findByRole('dialog', { name: 'Priya Raman' })).toBeInTheDocument()

    release()

    // Rather than sitting over the list refetching a record that is gone.
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog', { name: 'Priya Raman' }))
  })
})
