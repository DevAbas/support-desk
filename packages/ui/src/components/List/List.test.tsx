import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { List, ListRow } from './List'

describe('List', () => {
  it('names the list for a screen reader', () => {
    render(
      <List label="Customers">
        <ListRow title="Priya Raman" />
      </List>,
    )

    expect(screen.getByRole('list', { name: 'Customers' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })

  it('announces that it is loading, instead of its rows', () => {
    render(
      <List label="Customers" isLoading loadingMessage="Loading customers…">
        <ListRow title="Priya Raman" />
      </List>,
    )

    expect(screen.getByRole('status')).toHaveTextContent('Loading customers…')
    expect(screen.queryByText('Priya Raman')).not.toBeInTheDocument()
  })

  it('shows the empty message instead of its rows', () => {
    render(
      <List label="Customers" isEmpty emptyMessage="No customers match these filters.">
        <ListRow title="Priya Raman" />
      </List>,
    )

    expect(screen.getByText('No customers match these filters.')).toBeInTheDocument()
    expect(screen.queryByText('Priya Raman')).not.toBeInTheDocument()
  })

  it('prefers the loading state to the empty one', () => {
    render(<List label="Customers" isLoading isEmpty />)

    // Nothing has arrived yet, which is not the same as there being nothing.
    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
    expect(screen.queryByText('Nothing to show.')).not.toBeInTheDocument()
  })
})

describe('ListRow', () => {
  it('renders every part it is given', () => {
    render(
      <List label="Customers">
        <ListRow
          leading={<span>PR</span>}
          title="Priya Raman"
          subtitle="Northwind Labs"
          meta="8 tickets"
          trailing={<span>Free</span>}
        />
      </List>,
    )

    const row = screen.getByRole('listitem')

    expect(row).toHaveTextContent('PR')
    expect(row).toHaveTextContent('Priya Raman')
    expect(row).toHaveTextContent('Northwind Labs')
    expect(row).toHaveTextContent('8 tickets')
    expect(row).toHaveTextContent('Free')
  })

  it('is not interactive without an onSelect', () => {
    render(
      <List label="Customers">
        <ListRow title="Priya Raman" />
      </List>,
    )

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('makes the whole row the control when it can be selected', async () => {
    const onSelect = vi.fn()

    render(
      <List label="Customers">
        <ListRow title="Priya Raman" subtitle="Northwind Labs" onSelect={onSelect} />
      </List>,
    )

    // One control, not a link somewhere inside the row, and named by what is
    // written on the row rather than by a label repeating it.
    const row = screen.getByRole('button')

    expect(row).toHaveAccessibleName(/Priya Raman/)
    expect(row).toHaveTextContent('Northwind Labs')

    await userEvent.click(row)

    expect(onSelect).toHaveBeenCalledOnce()
  })

  it('is reachable and activatable from the keyboard', async () => {
    const onSelect = vi.fn()

    render(
      <List label="Customers">
        <ListRow title="Priya Raman" onSelect={onSelect} />
      </List>,
    )

    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Priya Raman' })).toHaveFocus()

    await userEvent.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledOnce()
  })

  it('has no checkbox unless it is given a selection', () => {
    render(
      <List label="Customers">
        <ListRow title="Priya Raman" onSelect={vi.fn()} />
      </List>,
    )

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('keeps the checkbox outside the row control, as a tab stop of its own', async () => {
    render(
      <List label="Customers">
        <ListRow
          title="Priya Raman"
          onSelect={vi.fn()}
          selection={{ label: 'Select Priya Raman', isChecked: false, onChange: vi.fn() }}
        />
      </List>,
    )

    const checkbox = screen.getByRole('checkbox', { name: 'Select Priya Raman' })
    const row = screen.getByRole('button', { name: 'Priya Raman' })

    // The whole point of the prop: inside the button it would not be reachable
    // and would not be a checkbox.
    expect(row).not.toContainElement(checkbox)

    await userEvent.tab()
    expect(checkbox).toHaveFocus()

    await userEvent.tab()
    expect(row).toHaveFocus()
  })

  it('ticks the row without opening it', async () => {
    const onSelect = vi.fn()
    const onChange = vi.fn()

    render(
      <List label="Customers">
        <ListRow
          title="Priya Raman"
          onSelect={onSelect}
          selection={{ label: 'Select Priya Raman', isChecked: false, onChange }}
        />
      </List>,
    )

    await userEvent.click(screen.getByRole('checkbox', { name: 'Select Priya Raman' }))

    expect(onChange).toHaveBeenCalledExactlyOnceWith(true)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('unticks a row that is already ticked', async () => {
    const onChange = vi.fn()

    render(
      <List label="Customers">
        <ListRow
          title="Priya Raman"
          selection={{ label: 'Select Priya Raman', isChecked: true, onChange }}
        />
      </List>,
    )

    const checkbox = screen.getByRole('checkbox', { name: 'Select Priya Raman' })
    expect(checkbox).toBeChecked()

    await userEvent.click(checkbox)
    expect(onChange).toHaveBeenCalledExactlyOnceWith(false)
  })

  it('marks the row whose detail is open beside it', () => {
    render(
      <List label="Customers">
        <ListRow title="Priya Raman" onSelect={vi.fn()} isSelected />
        <ListRow title="Marco Ellis" onSelect={vi.fn()} />
      </List>,
    )

    expect(screen.getByRole('button', { name: 'Priya Raman' })).toHaveAttribute(
      'aria-current',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Marco Ellis' })).not.toHaveAttribute('aria-current')
  })
})
