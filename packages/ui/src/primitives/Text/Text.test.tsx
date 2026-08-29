import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Text } from './Text'

describe('Text', () => {
  it('renders a paragraph by default', () => {
    render(<Text>Every support request in the queue.</Text>)

    expect(screen.getByText('Every support request in the queue.').tagName).toBe('P')
  })

  it('renders another element where a paragraph would not be valid', () => {
    render(<Text as="span">8 tickets</Text>)

    expect(screen.getByText('8 tickets').tagName).toBe('SPAN')
  })

  it('applies the tokens for the requested size and tone', () => {
    render(
      <Text size="caption" tone="muted">
        Signed up
      </Text>,
    )

    expect(screen.getByText('Signed up')).toHaveClass('text-caption', 'text-fg-muted')
  })

  it('falls back to body copy in the default tone', () => {
    render(<Text>Description</Text>)

    expect(screen.getByText('Description')).toHaveClass('text-body', 'text-fg')
  })

  it('wraps a long unbroken string rather than pushing its container wider', () => {
    render(<Text>{'https://example.test/' + 'a'.repeat(200)}</Text>)

    // `wrap-anywhere` rather than `break-words`: only the former shrinks
    // min-content, which is what a grid column sizes itself from.
    expect(screen.getByText(/^https:\/\/example\.test\//)).toHaveClass('wrap-anywhere')
  })

  it('keeps its size when a caller passes a colour', () => {
    render(<Text className="text-danger">Could not load tickets.</Text>)

    expect(screen.getByText('Could not load tickets.')).toHaveClass('text-body', 'text-danger')
  })
})
