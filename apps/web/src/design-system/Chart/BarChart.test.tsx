import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BarChart } from './BarChart'
import type { ChartDatum } from './Chart.types'

const data: readonly ChartDatum[] = [
  { id: 'open', label: 'Open', value: 12, tone: 'info' },
  { id: 'resolved', label: 'Resolved', value: 8, tone: 'success' },
  { id: 'closed', label: 'Closed', value: 0, tone: 'neutral' },
]

describe('BarChart', () => {
  it('renders the same figures as a table, named by its caption', () => {
    render(<BarChart caption="Tickets by status" data={data} valueLabel="Tickets" />)

    const table = screen.getByRole('table', { name: 'Tickets by status' })

    expect(table).toBeInTheDocument()
    // A header row plus one row per bar.
    expect(screen.getAllByRole('row')).toHaveLength(4)
    expect(screen.getByRole('columnheader', { name: 'Tickets' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Open' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '12' })).toBeInTheDocument()
  })

  it('keeps a bucket nothing landed in', () => {
    render(<BarChart caption="Tickets by status" data={data} valueLabel="Tickets" />)

    expect(screen.getByRole('cell', { name: 'Closed' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '0' })).toBeInTheDocument()
  })

  it('hides the drawn chart from assistive technology', () => {
    const { container } = render(
      <BarChart caption="Tickets by status" data={data} valueLabel="Tickets" />,
    )

    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument()
  })

  it('formats every value the same way it draws it', () => {
    render(
      <BarChart
        caption="Time to resolution"
        data={[{ id: 'open', label: 'Open', value: 12 }]}
        valueLabel="Hours"
        formatValue={(value) => `${String(value)}h`}
      />,
    )

    expect(screen.getByRole('cell', { name: '12h' })).toBeInTheDocument()
  })

  it('names its category column', () => {
    render(
      <BarChart
        caption="Tickets by assignee"
        data={data}
        valueLabel="Tickets"
        categoryLabel="Assignee"
      />,
    )

    expect(screen.getByRole('columnheader', { name: 'Assignee' })).toBeInTheDocument()
  })

  it('announces its loading state instead of drawing anything', () => {
    render(<BarChart caption="Tickets by status" data={data} valueLabel="Tickets" isLoading />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('renders the empty message rather than an empty axis', () => {
    render(
      <BarChart
        caption="Tickets by status"
        data={[]}
        valueLabel="Tickets"
        emptyMessage="No tickets in this range."
      />,
    )

    expect(screen.getByText('No tickets in this range.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
