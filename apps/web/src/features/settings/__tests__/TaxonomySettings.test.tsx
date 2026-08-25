import { screen, waitFor, waitForElementToBeRemoved, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { TicketListPage } from '@/features/tickets/TicketListPage'

async function renderSettings(role: 'admin' | 'agent' = 'admin') {
  renderWithProviders(<SettingsPage />, { role, initialEntries: ['/settings'] })

  if (role === 'admin') {
    await waitForElementToBeRemoved(() => screen.queryByText('Loading statuses and priorities…'))
  }
}

async function renderList() {
  renderWithProviders(<TicketListPage />, { initialEntries: ['/tickets'] })
  await waitForElementToBeRemoved(() => screen.queryByText('Loading tickets…'))
}

/** The row for one entry, found through the label field that names it. */
function row(value: string): HTMLElement {
  return screen.getByLabelText(`Label for ${value}`).closest('tr') as HTMLElement
}

async function save() {
  await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
}

describe('ticket statuses and priorities', () => {
  it('is not offered to an agent', async () => {
    await renderSettings('agent')

    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument()
    expect(screen.getByText(/Only admins can change what a ticket can be set to/)).toBeInTheDocument()
  })

  it('shows every status with its label and how many tickets hold it', async () => {
    await renderSettings()

    expect(screen.getByLabelText('Label for open')).toHaveValue('Open')
    expect(screen.getByLabelText('Label for closed')).toHaveValue('Closed')
    expect(screen.getByLabelText('Label for high')).toHaveValue('High')

    // The counts come from the queue, so they add up to the whole of it.
    const counts = ['open', 'pending', 'resolved', 'closed'].map((status) =>
      Number(within(row(status)).getAllByRole('cell').at(4)?.textContent),
    )
    expect(counts.reduce((sum, count) => sum + count, 0)).toBe(40)
  })

  it('saves a renamed label, and the ticket list then reads it', async () => {
    await renderSettings()

    const label = screen.getByLabelText('Label for pending')
    await userEvent.clear(label)
    await userEvent.type(label, 'Awaiting reply')
    await save()

    expect(await screen.findByText('Saved.')).toBeInTheDocument()

    await renderList()

    expect(await screen.findAllByText('Awaiting reply')).not.toHaveLength(0)
    expect(screen.queryByText('Pending')).not.toBeInTheDocument()
  })

  it('nothing is saved until the button is pressed', async () => {
    await renderSettings()

    const label = screen.getByLabelText('Label for open')
    await userEvent.clear(label)
    await userEvent.type(label, 'Fresh')
    await userEvent.click(screen.getByRole('button', { name: 'Discard changes' }))

    expect(screen.getByLabelText('Label for open')).toHaveValue('Open')
  })

  it('refuses to save an empty label', async () => {
    await renderSettings()

    await userEvent.clear(screen.getByLabelText('Label for open'))

    expect(within(row('open')).getByRole('alert')).toHaveTextContent('A label is required.')
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
  })

  it('adds a status, which a ticket can then be set to', async () => {
    await renderSettings()

    await userEvent.click(screen.getByRole('button', { name: 'Add status' }))
    await userEvent.type(screen.getByLabelText('Value for new status'), 'escalated')
    await userEvent.type(screen.getByLabelText('Label for escalated'), 'Escalated')
    await save()

    expect(await screen.findByText('Saved.')).toBeInTheDocument()

    await renderList()

    expect(
      within(screen.getByLabelText('Status')).getByRole('option', { name: 'Escalated' }),
    ).toBeInTheDocument()
  })

  /**
   * The one edit that changes tickets rather than only what they are called.
   * Removing a status in use is refused until it is told where those tickets go.
   */
  it('asks where the tickets go before removing a status that is in use', async () => {
    await renderSettings()

    const inUse = Number(within(row('pending')).getAllByRole('cell').at(4)?.textContent)
    expect(inUse).toBeGreaterThan(0)

    await userEvent.click(within(row('pending')).getByRole('button', { name: 'Remove pending' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(new RegExp(`${String(inUse)} tickets are set to this`)))
      .toBeInTheDocument()

    // Until one is chosen there is nowhere for them to go.
    expect(within(dialog).getByRole('button', { name: 'Remove and move' })).toBeDisabled()

    await userEvent.selectOptions(within(dialog).getByLabelText('Move those tickets to'), 'open')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove and move' }))
    await save()

    expect(
      await screen.findByText(`Saved. ${String(inUse)} tickets were moved onto another value.`),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Label for pending')).not.toBeInTheDocument()

    await renderList()

    await waitFor(() => {
      expect(
        within(screen.getByLabelText('Status')).queryByRole('option', { name: 'Pending' }),
      ).not.toBeInTheDocument()
    })
  })
})
