import { cleanup, screen, waitFor, waitForElementToBeRemoved, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetTickets } from '../../../lib/api'
import { renderWithProviders } from '../../../test/renderWithProviders'
import { SAVED_VIEWS_STORAGE_KEY } from '../savedViews'
import { TicketListPage } from '../TicketListPage'

async function renderList() {
  renderWithProviders(<TicketListPage />, { initialEntries: ['/tickets'] })
  await waitForElementToBeRemoved(() => screen.queryByText('Loading tickets…'))
}

/** Every filter change refetches; wait for it so assertions see the settled UI. */
async function waitForTickets() {
  await waitFor(() => {
    expect(screen.queryByText('Loading tickets…')).not.toBeInTheDocument()
  })
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

async function setStatus(status: string) {
  await userEvent.selectOptions(screen.getByLabelText('Status'), status)
  await waitForTickets()
}

async function setPriority(priority: string) {
  await userEvent.selectOptions(screen.getByLabelText('Priority'), priority)
  await waitForTickets()
}

describe('saved views', () => {
  beforeEach(() => {
    resetTickets()
    window.localStorage.clear()
  })

  it('starts with no views and All tickets selected', async () => {
    await renderList()

    expect(screen.getByText('No saved views yet. Set the filters you want, then save them.'))
      .toBeInTheDocument()
    expect(viewRow('All tickets')).toHaveAttribute('aria-current', 'true')
  })

  it('saves the current filters under a name and makes that view active', async () => {
    await renderList()
    await setStatus('open')

    await saveCurrentFiltersAs('Open tickets')

    const row = viewRow('Open tickets')
    expect(row).toHaveAttribute('aria-current', 'true')
    expect(within(row).queryByText('Modified')).not.toBeInTheDocument()
    expect(viewRow('All tickets')).not.toHaveAttribute('aria-current')
  })

  it('applies a view when it is selected', async () => {
    await renderList()
    await setStatus('open')
    await saveCurrentFiltersAs('Open tickets')

    await setStatus('all')
    await setPriority('high')
    await saveCurrentFiltersAs('High priority')

    await userEvent.click(viewRow('Open tickets'))
    await waitForTickets()

    expect(screen.getByLabelText('Status')).toHaveValue('open')
    expect(screen.getByLabelText('Priority')).toHaveValue('all')
    expect(viewRow('Open tickets')).toHaveAttribute('aria-current', 'true')
    expect(viewRow('High priority')).not.toHaveAttribute('aria-current')

    await userEvent.click(viewRow('All tickets'))
    await waitForTickets()

    expect(screen.getByLabelText('Status')).toHaveValue('all')
    expect(viewRow('All tickets')).toHaveAttribute('aria-current', 'true')
  })

  it('marks the active view as modified once the filters no longer match it', async () => {
    await renderList()
    await setStatus('open')
    await saveCurrentFiltersAs('Open tickets')

    await setPriority('high')

    expect(within(viewRow('Open tickets')).getByText('Modified')).toBeInTheDocument()

    await userEvent.click(viewRow('Open tickets'))
    await waitForTickets()

    expect(screen.getByLabelText('Priority')).toHaveValue('all')
    expect(within(viewRow('Open tickets')).queryByText('Modified')).not.toBeInTheDocument()
  })

  it('does not call a view modified over whitespace the search ignores', async () => {
    await renderList()
    await userEvent.type(screen.getByLabelText('Search'), 'invoice')
    await waitForTickets()
    await saveCurrentFiltersAs('Invoices')

    await userEvent.type(screen.getByLabelText('Search'), '  ')
    await waitForTickets()

    expect(within(viewRow('Invoices')).queryByText('Modified')).not.toBeInTheDocument()
  })

  it('renames a view', async () => {
    await renderList()
    await setStatus('open')
    await saveCurrentFiltersAs('Open tickets')

    await userEvent.click(screen.getByRole('button', { name: 'Rename Open tickets' }))

    const field = screen.getByLabelText('View name')
    await userEvent.clear(field)
    await userEvent.type(field, 'Still open')
    await userEvent.click(screen.getByRole('button', { name: 'Save name' }))

    expect(viewRow('Still open')).toHaveAttribute('aria-current', 'true')
    expect(screen.queryByRole('button', { name: 'Rename Open tickets' })).not.toBeInTheDocument()
  })

  it('refuses a name another view already has', async () => {
    await renderList()
    await setStatus('open')
    await saveCurrentFiltersAs('Open tickets')

    await setStatus('pending')
    await saveCurrentFiltersAs('open TICKETS')

    expect(screen.getByText('A view with that name already exists.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^open TICKETS/ })).not.toBeInTheDocument()
  })

  it('deletes a view once confirmed, leaving the filters on screen alone', async () => {
    await renderList()
    await setStatus('open')
    await saveCurrentFiltersAs('Open tickets')

    await userEvent.click(screen.getByRole('button', { name: 'Delete Open tickets' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete view' }))

    expect(screen.queryByRole('button', { name: /^Open tickets/ })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Status')).toHaveValue('open')

    // Nothing is selected any more, and the filters differ from the default.
    const allTickets = viewRow('All tickets')
    expect(allTickets).toHaveAttribute('aria-current', 'true')
    expect(within(allTickets).getByText('Modified')).toBeInTheDocument()
  })

  it('keeps views across a reload', async () => {
    await renderList()
    await setStatus('open')
    await saveCurrentFiltersAs('Open tickets')

    cleanup()
    await renderList()

    const row = viewRow('Open tickets')
    expect(row).toBeInTheDocument()
    // A fresh session starts on no view, with the filters at their defaults.
    expect(row).not.toHaveAttribute('aria-current')
    expect(screen.getByLabelText('Status')).toHaveValue('all')
  })

  it('survives storage that cannot be parsed', async () => {
    window.localStorage.setItem(SAVED_VIEWS_STORAGE_KEY, '{ not json')

    await renderList()

    expect(screen.getByText('No saved views yet. Set the filters you want, then save them.'))
      .toBeInTheDocument()
  })

  it('drops stored entries that no longer match the filter shape', async () => {
    window.localStorage.setItem(
      SAVED_VIEWS_STORAGE_KEY,
      JSON.stringify([
        { id: 'a', name: 'Fine', filters: { status: 'open', priority: 'all', search: '' } },
        { id: 'b', name: 'Stale', filters: { status: 'escalated', priority: 'all', search: '' } },
      ]),
    )

    await renderList()

    expect(viewRow('Fine')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Stale/ })).not.toBeInTheDocument()
  })
})
