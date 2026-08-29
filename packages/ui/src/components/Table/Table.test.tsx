import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from './Table'

function renderTable(body: ReactNode) {
  return render(
    <Table caption="Tickets">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Title</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
        </TableRow>
      </TableHead>
      {body}
    </Table>,
  )
}

describe('Table', () => {
  it('renders rows when it has data', () => {
    renderTable(
      <TableBody columnCount={2}>
        <TableRow>
          <TableCell>Cannot log in</TableCell>
          <TableCell>Open</TableCell>
        </TableRow>
      </TableBody>,
    )

    expect(screen.getByText('Cannot log in')).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(2)
  })

  it('renders a loading row instead of its children', () => {
    renderTable(
      <TableBody columnCount={2} isLoading>
        <TableRow>
          <TableCell>Cannot log in</TableCell>
          <TableCell>Open</TableCell>
        </TableRow>
      </TableBody>,
    )

    expect(screen.getByRole('status')).toHaveTextContent('Loading')
    expect(screen.queryByText('Cannot log in')).not.toBeInTheDocument()
  })

  it('renders the empty message when there is no data', () => {
    renderTable(<TableBody columnCount={2} isEmpty emptyMessage="No tickets match this filter." />)

    expect(screen.getByText('No tickets match this filter.')).toBeInTheDocument()
  })

  it('exposes its caption as the accessible name', () => {
    renderTable(<TableBody columnCount={2} isEmpty />)

    expect(screen.getByRole('table', { name: 'Tickets' })).toBeInTheDocument()
  })
})
