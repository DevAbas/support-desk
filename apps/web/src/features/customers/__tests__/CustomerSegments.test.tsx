import { cleanup, screen, waitForElementToBeRemoved, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import { CUSTOMER_SEGMENTS_STORAGE_KEY } from '@/features/customers/customerSegments'
import { CustomersPage } from '@/features/customers/CustomersPage'

/**
 * Driven against the real API through MSW like the rest of the customer screen,
 * so applying a segment is asserted through the list it actually produces.
 *
 * The seed holds sixty customers: five on Enterprise, nine on Pro, and three
 * whose name, company or email mentions Northwind.
 */
async function renderCustomers() {
  renderWithProviders(<CustomersPage />, { initialEntries: ['/customers'] })
  await waitForElementToBeRemoved(() => screen.queryByText('Loading customers…'))
}

/**
 * The chip for a segment. Anchored so it does not also match that segment's
 * "Rename …" and "Delete …" controls, and prefixed so it still matches once a
 * "Modified" badge has been added to the name.
 */
function segmentChip(name: string) {
  return screen.getByRole('button', { name: new RegExp(`^${name}`) })
}

/** How many the filters match, which is how the list says it has settled. */
function showing(loaded: number, total: number) {
  return screen.findByText(`Showing ${String(loaded)} of ${String(total)}`)
}

async function togglePlan(plan: string) {
  await userEvent.click(screen.getByRole('button', { name: /^Plan / }))
  await userEvent.click(screen.getByRole('checkbox', { name: plan }))
  // Closed again, so the group is not left over the strip it was opened from.
  await userEvent.keyboard('{Escape}')
}

async function saveCurrentFiltersAs(name: string) {
  await userEvent.click(screen.getByRole('button', { name: 'Save these filters' }))
  await userEvent.type(screen.getByLabelText('Segment name'), name)
  await userEvent.click(screen.getByRole('button', { name: 'Save segment' }))
}

describe('saved segments', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('starts with no segments and the whole list selected', async () => {
    await renderCustomers()

    expect(screen.getByText('Filter the list, then save it as a segment.')).toBeInTheDocument()
    expect(segmentChip('All customers')).toHaveAttribute('aria-current', 'true')
  })

  it('saves the filters on screen under a name and makes that segment active', async () => {
    await renderCustomers()
    await togglePlan('Enterprise')
    await showing(5, 5)

    await saveCurrentFiltersAs('Enterprise accounts')

    const chip = segmentChip('Enterprise accounts')
    expect(chip).toHaveAttribute('aria-current', 'true')
    expect(within(chip).queryByText('Modified')).not.toBeInTheDocument()
    expect(segmentChip('All customers')).not.toHaveAttribute('aria-current')
  })

  it('applies a segment when it is selected', async () => {
    await renderCustomers()
    await togglePlan('Enterprise')
    await showing(5, 5)
    await saveCurrentFiltersAs('Enterprise accounts')

    await togglePlan('Enterprise')
    await userEvent.type(screen.getByLabelText('Search'), 'northwind')
    await showing(3, 3)
    await saveCurrentFiltersAs('Northwind people')

    await userEvent.click(segmentChip('Enterprise accounts'))

    await showing(5, 5)
    expect(screen.getByLabelText('Search')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Plan Enterprise' })).toBeInTheDocument()
    expect(segmentChip('Enterprise accounts')).toHaveAttribute('aria-current', 'true')
    expect(segmentChip('Northwind people')).not.toHaveAttribute('aria-current')

    await userEvent.click(segmentChip('All customers'))

    await showing(20, 60)
    expect(screen.getByRole('button', { name: 'Plan All plans' })).toBeInTheDocument()
    expect(segmentChip('All customers')).toHaveAttribute('aria-current', 'true')
  })

  it('marks the active segment as modified once the filters no longer match it', async () => {
    await renderCustomers()
    await togglePlan('Enterprise')
    await showing(5, 5)
    await saveCurrentFiltersAs('Enterprise accounts')

    await togglePlan('Pro')
    await showing(14, 14)

    expect(within(segmentChip('Enterprise accounts')).getByText('Modified')).toBeInTheDocument()

    await userEvent.click(segmentChip('Enterprise accounts'))

    await showing(5, 5)
    expect(within(segmentChip('Enterprise accounts')).queryByText('Modified')).not.toBeInTheDocument()
  })

  it('does not call a segment modified over whitespace the search ignores', async () => {
    await renderCustomers()
    await userEvent.type(screen.getByLabelText('Search'), 'northwind')
    await showing(3, 3)
    await saveCurrentFiltersAs('Northwind people')

    await userEvent.type(screen.getByLabelText('Search'), '  ')
    await showing(3, 3)

    expect(within(segmentChip('Northwind people')).queryByText('Modified')).not.toBeInTheDocument()
  })

  it('does not call a segment modified over the order its plans were ticked in', async () => {
    window.localStorage.setItem(
      CUSTOMER_SEGMENTS_STORAGE_KEY,
      JSON.stringify([
        { id: 'a', name: 'Paying', filters: { plans: ['enterprise', 'pro'], search: '' } },
      ]),
    )

    await renderCustomers()
    await userEvent.click(segmentChip('Paying'))

    await showing(14, 14)
    expect(screen.getByRole('button', { name: 'Plan 2 selected' })).toBeInTheDocument()
    expect(within(segmentChip('Paying')).queryByText('Modified')).not.toBeInTheDocument()
  })

  it('offers rename and delete for the selected segment only', async () => {
    await renderCustomers()
    await togglePlan('Enterprise')
    await showing(5, 5)
    await saveCurrentFiltersAs('Enterprise accounts')

    expect(screen.getByRole('button', { name: 'Rename Enterprise accounts' })).toBeInTheDocument()

    await userEvent.click(segmentChip('All customers'))
    await showing(20, 60)

    expect(screen.queryByRole('button', { name: 'Rename Enterprise accounts' })).not
      .toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete Enterprise accounts' })).not
      .toBeInTheDocument()
  })

  it('renames a segment', async () => {
    await renderCustomers()
    await togglePlan('Enterprise')
    await showing(5, 5)
    await saveCurrentFiltersAs('Enterprise accounts')

    await userEvent.click(screen.getByRole('button', { name: 'Rename Enterprise accounts' }))

    const field = screen.getByLabelText('Segment name')
    await userEvent.clear(field)
    await userEvent.type(field, 'Biggest accounts')
    await userEvent.click(screen.getByRole('button', { name: 'Save name' }))

    expect(segmentChip('Biggest accounts')).toHaveAttribute('aria-current', 'true')
    expect(screen.queryByRole('button', { name: 'Rename Enterprise accounts' })).not
      .toBeInTheDocument()
  })

  it('refuses a name another segment already has', async () => {
    await renderCustomers()
    await togglePlan('Enterprise')
    await showing(5, 5)
    await saveCurrentFiltersAs('Enterprise accounts')

    await togglePlan('Pro')
    await showing(14, 14)
    await saveCurrentFiltersAs('enterprise ACCOUNTS')

    expect(screen.getByText('A segment with that name already exists.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^enterprise ACCOUNTS/ })).not.toBeInTheDocument()
  })

  it('deletes a segment once confirmed, leaving the filters on screen alone', async () => {
    await renderCustomers()
    await togglePlan('Enterprise')
    await showing(5, 5)
    await saveCurrentFiltersAs('Enterprise accounts')

    await userEvent.click(screen.getByRole('button', { name: 'Delete Enterprise accounts' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete segment' }))

    expect(screen.queryByRole('button', { name: /^Enterprise accounts/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Plan Enterprise' })).toBeInTheDocument()
    await showing(5, 5)

    // Nothing is selected any more, and the filters differ from the default.
    const allCustomers = segmentChip('All customers')
    expect(allCustomers).toHaveAttribute('aria-current', 'true')
    expect(within(allCustomers).getByText('Modified')).toBeInTheDocument()
  })

  it('keeps segments across a reload', async () => {
    await renderCustomers()
    await togglePlan('Enterprise')
    await showing(5, 5)
    await saveCurrentFiltersAs('Enterprise accounts')

    cleanup()
    await renderCustomers()

    const chip = segmentChip('Enterprise accounts')
    expect(chip).toBeInTheDocument()
    // A fresh session starts on no segment, with the filters at their defaults.
    expect(chip).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('button', { name: 'Plan All plans' })).toBeInTheDocument()
  })

  it('survives storage that cannot be parsed', async () => {
    window.localStorage.setItem(CUSTOMER_SEGMENTS_STORAGE_KEY, '{ not json')

    await renderCustomers()

    expect(screen.getByText('Filter the list, then save it as a segment.')).toBeInTheDocument()
  })

  it('drops stored entries that no longer match the filter shape', async () => {
    window.localStorage.setItem(
      CUSTOMER_SEGMENTS_STORAGE_KEY,
      JSON.stringify([
        { id: 'a', name: 'Fine', filters: { plans: ['pro'], search: '' } },
        { id: 'b', name: 'Stale', filters: { plans: ['platinum'], search: '' } },
      ]),
    )

    await renderCustomers()

    expect(segmentChip('Fine')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Stale/ })).not.toBeInTheDocument()
  })
})
