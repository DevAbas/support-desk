import { cleanup, screen, waitFor, waitForElementToBeRemoved, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import { CUSTOMER_SAVED_VIEWS_STORAGE_KEY } from '@/features/customers/savedViews'
import { CustomersPage } from '@/features/customers/CustomersPage'
import { SAVED_VIEWS_STORAGE_KEY } from '@/features/tickets/savedViews'

/**
 * The same saved views as the ticket queue, over a different shape of filter.
 *
 * This file is deliberately the ticket screen's `SavedViews.test.tsx` asked of
 * the customer list, because that is the claim the shared mechanism makes: the
 * behaviour is one behaviour, and what the customer list brought to it is one
 * scope describing a set filter instead of a widened single value. Where the two
 * files differ is where the filters differ — a plan is ticked rather than
 * selected, and ticking the same two plans in the other order is the same
 * question.
 */

async function renderList() {
  renderWithProviders(<CustomersPage />, { initialEntries: ['/customers'] })
  await waitForElementToBeRemoved(() => screen.queryByText('Loading customers…'))
}

/**
 * The row button for a view. Anchored so it does not also match that view's
 * "Rename …" and "Delete …" controls, and prefixed so it still matches once a
 * "Modified" badge has been added to the name.
 */
function viewRow(name: string) {
  return screen.getByRole('button', { name: new RegExp(`^${name}`) })
}

async function saveCurrentFiltersAs(name: string) {
  await userEvent.click(screen.getByRole('button', { name: 'Save current filters' }))
  await userEvent.type(screen.getByLabelText('View name'), name)
  await userEvent.click(screen.getByRole('button', { name: 'Save view' }))
}

/** The plan filter is a disclosure over a group of checkboxes, so it is opened first. */
async function tickPlans(...plans: string[]) {
  await userEvent.click(screen.getByRole('button', { name: /^Plan/ }))

  for (const plan of plans) {
    await userEvent.click(screen.getByRole('checkbox', { name: plan }))
  }

  await userEvent.keyboard('{Escape}')
}

describe('customer saved views', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('starts with no views and All customers selected', async () => {
    await renderList()

    expect(
      screen.getByText('No saved views yet. Set the filters you want, then save them.'),
    ).toBeInTheDocument()
    expect(viewRow('All customers')).toHaveAttribute('aria-current', 'true')
  })

  it('saves the current filters under a name and makes that view active', async () => {
    await renderList()
    await tickPlans('Enterprise')
    expect(await screen.findByText('Showing 5 of 5')).toBeInTheDocument()

    await saveCurrentFiltersAs('Enterprise accounts')

    const row = viewRow('Enterprise accounts')
    expect(row).toHaveAttribute('aria-current', 'true')
    expect(within(row).queryByText('Modified')).not.toBeInTheDocument()
    expect(viewRow('All customers')).not.toHaveAttribute('aria-current')
  })

  it('applies a view when it is selected, filters and search together', async () => {
    await renderList()
    await tickPlans('Free')
    await userEvent.type(screen.getByLabelText('Search'), 'northwind')
    await screen.findByText('Showing 2 of 2')
    await saveCurrentFiltersAs('Northwind, on free')

    await userEvent.click(viewRow('All customers'))

    expect(await screen.findByText('Showing 20 of 60')).toBeInTheDocument()
    expect(screen.getByLabelText('Search')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Plan All plans' })).toBeInTheDocument()

    await userEvent.click(viewRow('Northwind, on free'))

    expect(await screen.findByText('Showing 2 of 2')).toBeInTheDocument()
    expect(screen.getByLabelText('Search')).toHaveValue('northwind')
    expect(screen.getByRole('button', { name: 'Plan Free' })).toBeInTheDocument()
    expect(viewRow('Northwind, on free')).toHaveAttribute('aria-current', 'true')
  })

  it('marks the active view as modified once the filters no longer match it', async () => {
    await renderList()
    await tickPlans('Enterprise')
    await screen.findByText('Showing 5 of 5')
    await saveCurrentFiltersAs('Enterprise accounts')

    await tickPlans('Pro')
    await screen.findByText('Showing 14 of 14')

    expect(within(viewRow('Enterprise accounts')).getByText('Modified')).toBeInTheDocument()

    await userEvent.click(viewRow('Enterprise accounts'))

    expect(await screen.findByText('Showing 5 of 5')).toBeInTheDocument()
    expect(within(viewRow('Enterprise accounts')).queryByText('Modified')).not.toBeInTheDocument()
  })

  it('does not call a view modified over whitespace the search ignores', async () => {
    await renderList()
    await userEvent.type(screen.getByLabelText('Search'), 'northwind')
    await screen.findByText('Showing 3 of 3')
    await saveCurrentFiltersAs('Northwind')

    await userEvent.type(screen.getByLabelText('Search'), '  ')

    await waitFor(() => {
      expect(screen.getByLabelText('Search')).toHaveValue('northwind  ')
    })
    expect(within(viewRow('Northwind')).queryByText('Modified')).not.toBeInTheDocument()
  })

  it('does not call a view modified over the order the same plans were ticked in', async () => {
    // The question a set filter asks is which plans, not in which order they
    // were chosen — the one thing here the ticket screen's comparison has no
    // opinion about, because a widened single value cannot be reordered.
    await renderList()
    await tickPlans('Pro', 'Enterprise')
    await screen.findByText('Showing 14 of 14')
    await saveCurrentFiltersAs('Paying customers')

    await tickPlans('Pro')
    await screen.findByText('Showing 5 of 5')
    await tickPlans('Pro')
    await screen.findByText('Showing 14 of 14')

    expect(within(viewRow('Paying customers')).queryByText('Modified')).not.toBeInTheDocument()
  })

  it('renames a view', async () => {
    await renderList()
    await tickPlans('Enterprise')
    await saveCurrentFiltersAs('Enterprise accounts')

    await userEvent.click(screen.getByRole('button', { name: 'Rename Enterprise accounts' }))

    const field = screen.getByLabelText('View name')
    await userEvent.clear(field)
    await userEvent.type(field, 'The big ones')
    await userEvent.click(screen.getByRole('button', { name: 'Save name' }))

    expect(viewRow('The big ones')).toHaveAttribute('aria-current', 'true')
    expect(
      screen.queryByRole('button', { name: 'Rename Enterprise accounts' }),
    ).not.toBeInTheDocument()
  })

  it('refuses a name another view already has', async () => {
    await renderList()
    await tickPlans('Enterprise')
    await saveCurrentFiltersAs('Enterprise accounts')

    await tickPlans('Pro')
    await saveCurrentFiltersAs('enterprise ACCOUNTS')

    expect(screen.getByText('A view with that name already exists.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^enterprise ACCOUNTS/ })).not.toBeInTheDocument()
  })

  it('deletes a view once confirmed, leaving the filters on screen alone', async () => {
    await renderList()
    await tickPlans('Enterprise')
    await screen.findByText('Showing 5 of 5')
    await saveCurrentFiltersAs('Enterprise accounts')

    await userEvent.click(screen.getByRole('button', { name: 'Delete Enterprise accounts' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete view' }))

    expect(screen.queryByRole('button', { name: /^Enterprise accounts/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Plan Enterprise' })).toBeInTheDocument()

    // Nothing is selected any more, and the filters differ from the default.
    const allCustomers = viewRow('All customers')
    expect(allCustomers).toHaveAttribute('aria-current', 'true')
    expect(within(allCustomers).getByText('Modified')).toBeInTheDocument()
  })

  it('keeps views across a reload', async () => {
    await renderList()
    await tickPlans('Enterprise')
    await saveCurrentFiltersAs('Enterprise accounts')

    cleanup()
    await renderList()

    const row = viewRow('Enterprise accounts')
    expect(row).toBeInTheDocument()
    // A fresh session starts on no view, with the filters at their defaults.
    expect(row).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('button', { name: 'Plan All plans' })).toBeInTheDocument()
  })

  it('survives storage that cannot be parsed', async () => {
    window.localStorage.setItem(CUSTOMER_SAVED_VIEWS_STORAGE_KEY, '{ not json')

    await renderList()

    expect(
      screen.getByText('No saved views yet. Set the filters you want, then save them.'),
    ).toBeInTheDocument()
  })

  it('drops stored entries that name a plan the domain no longer has', async () => {
    window.localStorage.setItem(
      CUSTOMER_SAVED_VIEWS_STORAGE_KEY,
      JSON.stringify([
        { id: 'a', name: 'Fine', filters: { plans: ['pro'], search: '' } },
        { id: 'b', name: 'Stale', filters: { plans: ['legacy'], search: '' } },
      ]),
    )

    await renderList()

    expect(viewRow('Fine')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Stale/ })).not.toBeInTheDocument()
  })

  it('does not show the ticket queue’s views', async () => {
    // One key per screen, which is what makes a third screen cost nothing to
    // add and makes neither screen able to write over the other.
    window.localStorage.setItem(
      SAVED_VIEWS_STORAGE_KEY,
      JSON.stringify([
        { id: 'a', name: 'Open tickets', filters: { status: 'open', priority: 'all', search: '' } },
      ]),
    )

    await renderList()

    expect(screen.queryByRole('button', { name: /^Open tickets/ })).not.toBeInTheDocument()
    expect(
      screen.getByText('No saved views yet. Set the filters you want, then save them.'),
    ).toBeInTheDocument()
  })
})
