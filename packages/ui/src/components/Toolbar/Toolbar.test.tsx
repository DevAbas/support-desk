import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Toolbar } from './Toolbar'

describe('Toolbar', () => {
  it('owns the strip padding, which is not the card scale', () => {
    render(<Toolbar data-testid="strip">Controls</Toolbar>)

    const strip = screen.getByTestId('strip')

    expect(strip).toHaveClass('px-3', 'py-2')
    expect(strip).not.toHaveClass('px-4', 'py-3')
  })

  it('separates itself with its bottom edge by default, because a strip sits above', () => {
    render(<Toolbar data-testid="strip">Controls</Toolbar>)

    expect(screen.getByTestId('strip')).toHaveClass('border-b', 'border-border')
  })

  it('draws its top edge when it sits below what it acts on', () => {
    render(
      <Toolbar divider="top" data-testid="strip">
        Controls
      </Toolbar>,
    )

    const strip = screen.getByTestId('strip')

    expect(strip).toHaveClass('border-t', 'border-border')
    expect(strip).not.toHaveClass('border-b')
  })

  it('draws no edge where the strips around it already do', () => {
    render(
      <Toolbar divider="none" data-testid="strip">
        Controls
      </Toolbar>,
    )

    const strip = screen.getByTestId('strip')

    expect(strip).not.toHaveClass('border-b')
    expect(strip).not.toHaveClass('border-t')
  })

  it('is a nav where the strip is a landmark, and never claims role="toolbar"', () => {
    render(
      <Toolbar as="nav" divider="top" aria-label="Ticket list pagination">
        Pages
      </Toolbar>,
    )

    expect(screen.getByRole('navigation', { name: 'Ticket list pagination' })).toBeInTheDocument()
    // `role="toolbar"` promises one tab stop and arrow-key movement; this
    // strip does neither, so it does not say so.
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument()
  })

  it('lets the caller arrange its own children without touching the padding', () => {
    render(
      <Toolbar className="items-end justify-between bg-primary-subtle" data-testid="strip">
        Controls
      </Toolbar>,
    )

    const strip = screen.getByTestId('strip')

    expect(strip).toHaveClass('items-end', 'justify-between', 'bg-primary-subtle', 'px-3', 'py-2')
    // `cn()` drops the default the caller replaced rather than keeping both.
    expect(strip).not.toHaveClass('items-center')
  })

  it('passes the group role and label a bulk bar needs straight through', () => {
    render(
      <Toolbar role="group" aria-label="Bulk actions">
        Apply
      </Toolbar>,
    )

    expect(screen.getByRole('group', { name: 'Bulk actions' })).toBeInTheDocument()
  })
})
