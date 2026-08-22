import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Badge } from './Badge'

describe('Badge', () => {
  it('renders its content', () => {
    render(<Badge>Open</Badge>)

    expect(screen.getByText('Open')).toBeInTheDocument()
  })

  it('applies the classes for the requested status', () => {
    render(<Badge status="success">Resolved</Badge>)

    expect(screen.getByText('Resolved')).toHaveClass('bg-success-subtle')
  })

  it('falls back to the neutral status', () => {
    render(<Badge>Closed</Badge>)

    expect(screen.getByText('Closed')).toHaveClass('bg-muted')
  })
})
