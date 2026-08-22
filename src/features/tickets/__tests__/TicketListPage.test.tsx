import { screen, waitForElementToBeRemoved } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
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
})
