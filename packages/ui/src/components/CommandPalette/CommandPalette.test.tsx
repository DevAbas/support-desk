import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CommandPalette } from './CommandPalette'
import type { CommandPaletteGroup } from './CommandPalette.types'

const GROUPS: readonly CommandPaletteGroup[] = [
  {
    id: 'tickets',
    label: 'Tickets',
    meta: '2 of 40',
    options: [
      { id: 'ticket:TCK-0001', title: 'Cannot sign in', subtitle: 'TCK-0001' },
      { id: 'ticket:TCK-0002', title: 'Invoice is empty', subtitle: 'TCK-0002' },
    ],
  },
  {
    id: 'navigation',
    label: 'Go to',
    options: [{ id: 'navigation:reports', title: 'Reports' }],
  },
]

interface Options {
  groups?: readonly CommandPaletteGroup[]
  isLoading?: boolean
  onSelect?: (optionId: string) => void
  onClose?: () => void
  onValueChange?: (value: string) => void
}

function renderPalette({
  groups = GROUPS,
  isLoading = false,
  onSelect = () => {},
  onClose = () => {},
  onValueChange = () => {},
}: Options = {}) {
  return render(
    <CommandPalette
      open
      onClose={onClose}
      label="Search"
      placeholder="Tickets, customers and screens"
      value="inv"
      onValueChange={onValueChange}
      groups={groups}
      onSelect={onSelect}
      isLoading={isLoading}
      emptyMessage="No matches."
      loadingMessage="Searching…"
    />,
  )
}

/** The field, which is where focus lives for the whole life of the palette. */
function field(): HTMLElement {
  return screen.getByRole('combobox', { name: 'Search' })
}

function activeOption(): HTMLElement | null {
  const id = field().getAttribute('aria-activedescendant')

  return id === null ? null : document.getElementById(id)
}

describe('CommandPalette', () => {
  it('renders nothing while closed', () => {
    render(
      <CommandPalette
        open={false}
        onClose={() => {}}
        label="Search"
        value=""
        onValueChange={() => {}}
        groups={GROUPS}
        onSelect={() => {}}
      />,
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('is a dialog named by its label, with the field as its header', () => {
    renderPalette()

    const dialog = screen.getByRole('dialog', { name: 'Search' })

    expect(dialog).toHaveAttribute('aria-modal', 'true')
    // The name is read rather than drawn: the top of the panel is the field, so
    // the heading that names the dialog is there for a reader and not the eye.
    expect(within(dialog).getByRole('heading', { name: 'Search' }).parentElement).toHaveClass(
      'sr-only',
    )
    expect(field()).toHaveValue('inv')
  })

  it('puts focus in the field rather than on the panel', () => {
    renderPalette()

    expect(field()).toHaveFocus()
  })

  it('is a combobox over a listbox of grouped options', () => {
    renderPalette()

    const list = screen.getByRole('listbox', { name: 'Search results' })

    expect(field()).toHaveAttribute('aria-controls', list.id)
    expect(within(list).getAllByRole('option')).toHaveLength(3)
    expect(within(list).getByRole('group', { name: /Tickets/ })).toBeInTheDocument()
    expect(within(list).getByRole('group', { name: 'Go to' })).toBeInTheDocument()
  })

  it('says how many of a group there were beside its heading', () => {
    renderPalette()

    expect(screen.getByText('2 of 40')).toBeInTheDocument()
  })

  it('starts with the first option active', () => {
    renderPalette()

    expect(activeOption()).toHaveTextContent('Cannot sign in')
  })

  it('walks the options with the arrow keys, across groups and round the end', async () => {
    renderPalette()

    await userEvent.keyboard('{ArrowDown}')
    expect(activeOption()).toHaveTextContent('Invoice is empty')

    // Down again crosses into the next group: the keyboard walks one sequence,
    // not one per heading.
    await userEvent.keyboard('{ArrowDown}')
    expect(activeOption()).toHaveTextContent('Reports')

    await userEvent.keyboard('{ArrowDown}')
    expect(activeOption()).toHaveTextContent('Cannot sign in')

    await userEvent.keyboard('{ArrowUp}')
    expect(activeOption()).toHaveTextContent('Reports')
  })

  it('marks only the active option as selected', async () => {
    renderPalette()

    await userEvent.keyboard('{ArrowDown}')

    const selected = screen.getAllByRole('option').filter(
      (option) => option.getAttribute('aria-selected') === 'true',
    )

    expect(selected).toHaveLength(1)
    expect(selected[0]).toHaveTextContent('Invoice is empty')
  })

  it('keeps focus in the field while the arrow keys move', async () => {
    renderPalette()

    await userEvent.keyboard('{ArrowDown}')

    expect(field()).toHaveFocus()
  })

  it('picks the active option on Enter', async () => {
    const onSelect = vi.fn()
    renderPalette({ onSelect })

    await userEvent.keyboard('{ArrowDown}{Enter}')

    expect(onSelect).toHaveBeenCalledExactlyOnceWith('ticket:TCK-0002')
  })

  it('picks an option that is clicked', async () => {
    const onSelect = vi.fn()
    renderPalette({ onSelect })

    await userEvent.click(screen.getByRole('option', { name: /Reports/ }))

    expect(onSelect).toHaveBeenCalledExactlyOnceWith('navigation:reports')
  })

  it('takes the active option back to the top when the results are replaced', async () => {
    const { rerender } = render(
      <CommandPalette
        open
        onClose={() => {}}
        label="Search"
        value="inv"
        onValueChange={() => {}}
        groups={GROUPS}
        onSelect={() => {}}
      />,
    )

    await userEvent.keyboard('{ArrowDown}')
    expect(activeOption()).toHaveTextContent('Invoice is empty')

    rerender(
      <CommandPalette
        open
        onClose={() => {}}
        label="Search"
        value="invoi"
        onValueChange={() => {}}
        groups={[
          { id: 'tickets', label: 'Tickets', options: [{ id: 'ticket:TCK-0009', title: 'Something else' }] },
        ]}
        onSelect={() => {}}
      />,
    )

    // The remembered option is gone, so the first of what is there now is
    // active — not whatever happens to sit at the index it used to hold.
    expect(activeOption()).toHaveTextContent('Something else')
  })

  it('reports the query rather than holding it', async () => {
    const onValueChange = vi.fn()
    renderPalette({ onValueChange })

    await userEvent.type(field(), 'o')

    expect(onValueChange).toHaveBeenCalledWith('invo')
  })

  it('says there is nothing rather than drawing an empty list', () => {
    renderPalette({ groups: [] })

    expect(screen.getByText('No matches.')).toBeInTheDocument()
    expect(screen.queryAllByRole('option')).toHaveLength(0)
  })

  it('does nothing on Enter when there is nothing to pick', async () => {
    const onSelect = vi.fn()
    renderPalette({ groups: [], onSelect })

    await userEvent.keyboard('{Enter}')

    expect(onSelect).not.toHaveBeenCalled()
    expect(field()).not.toHaveAttribute('aria-activedescendant')
  })

  it('announces a wait, and shows it instead of an empty message', () => {
    renderPalette({ groups: [], isLoading: true })

    expect(screen.getByRole('status')).toHaveTextContent('Searching…')
    expect(screen.queryByText('No matches.')).not.toBeInTheDocument()
  })

  it('closes on Escape and from the close button', async () => {
    const onClose = vi.fn()
    renderPalette({ onClose })

    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()

    await userEvent.click(screen.getByRole('button', { name: 'Close search' }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('reports a failure inside the panel, where the reader is', () => {
    render(
      <CommandPalette
        open
        onClose={() => {}}
        label="Search"
        value="inv"
        onValueChange={() => {}}
        groups={[]}
        onSelect={() => {}}
        error="Could not reach the server."
      />,
    )

    const dialog = screen.getByRole('dialog', { name: 'Search' })

    expect(within(dialog).getByRole('alert')).toHaveTextContent('Could not reach the server.')
    // And not "nothing matched" underneath it: the request never got far enough
    // to say anything about the query.
    expect(within(dialog).queryByText('Nothing to show.')).not.toBeInTheDocument()
  })
})
