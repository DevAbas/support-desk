import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatCard } from './StatCard'

describe('StatCard', () => {
  it('renders the figure and what it counts', () => {
    render(<StatCard label="Resolved" value="128" />)

    expect(screen.getByText('Resolved')).toBeInTheDocument()
    expect(screen.getByText('128')).toBeInTheDocument()
  })

  it('says the direction in words rather than leaving it to the arrow', () => {
    render(
      <StatCard
        label="Resolved"
        value="128"
        change={{ label: '+12%', direction: 'up', intent: 'positive', description: 'vs previous 30 days' }}
      />,
    )

    // The arrow is decorative, so the accessible text carries the direction.
    expect(screen.getByText('Up')).toBeInTheDocument()
    expect(screen.getByText('+12%')).toBeInTheDocument()
    expect(screen.getByText('vs previous 30 days')).toBeInTheDocument()
  })

  it('colours the change by intent rather than by direction', () => {
    const { rerender } = render(
      <StatCard label="Raised" value="40" change={{ label: '+12%', direction: 'up', intent: 'negative' }} />,
    )

    expect(screen.getByText('+12%').parentElement).toHaveClass('text-danger-subtle-fg')

    rerender(
      <StatCard label="Resolved" value="40" change={{ label: '+12%', direction: 'up', intent: 'positive' }} />,
    )

    expect(screen.getByText('+12%').parentElement).toHaveClass('text-success-subtle-fg')
  })

  it('announces its loading state instead of showing a figure', () => {
    render(<StatCard label="Resolved" value="128" isLoading />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading')
    expect(screen.queryByText('128')).not.toBeInTheDocument()
  })

  it('renders no change when there is nothing to compare with', () => {
    render(<StatCard label="Resolved" value="128" />)

    expect(screen.queryByText('Up')).not.toBeInTheDocument()
  })
})
