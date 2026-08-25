import { screen, waitForElementToBeRemoved, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { mswServer } from '@/test/msw/server'
import { renderWithProviders } from '@/test/renderWithProviders'
import { CustomersPage } from '@/features/customers/CustomersPage'

/**
 * The screen is driven against the real API through MSW, the same way the ticket
 * screens are, so what is asserted here is the real cursor paging and the real
 * plan filtering rather than a fixture agreeing with itself.
 *
 * The seed holds sixty customers, ten of whom have raised something.
 */
async function renderCustomers() {
  renderWithProviders(<CustomersPage />, { initialEntries: ['/customers'] })
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
})
