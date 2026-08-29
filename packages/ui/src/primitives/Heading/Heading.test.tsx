import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Heading } from './Heading'

describe('Heading', () => {
  it('renders the element its level implies', () => {
    render(<Heading level="page">Tickets</Heading>)

    expect(screen.getByRole('heading', { level: 1, name: 'Tickets' })).toBeInTheDocument()
  })

  it('falls back to the section level', () => {
    render(<Heading>Filters</Heading>)

    const heading = screen.getByRole('heading', { level: 2, name: 'Filters' })

    expect(heading).toHaveClass('text-section')
  })

  it('applies the token for the requested level', () => {
    const { rerender } = render(<Heading level="page">Tickets</Heading>)

    expect(screen.getByRole('heading', { name: 'Tickets' })).toHaveClass('text-title')

    rerender(<Heading level="subsection">Tickets</Heading>)

    expect(screen.getByRole('heading', { name: 'Tickets' })).toHaveClass('text-subsection')
  })

  it('changes the element without changing the level', () => {
    render(
      <Heading level="page" as="h2">
        Priya Raman
      </Heading>,
    )

    // Looks like a page title, sits under something else in the outline.
    const heading = screen.getByRole('heading', { level: 2, name: 'Priya Raman' })

    expect(heading).toHaveClass('text-title')
  })

  it('keeps its level when a caller passes a colour', () => {
    // The trap `cn()` is extended to avoid: without it tailwind-merge reads the
    // level token as a colour and drops it.
    render(<Heading level="page" className="text-fg-muted" />)

    expect(document.querySelector('h1')).toHaveClass('text-title', 'text-fg-muted')
  })
})
