import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Icon } from './Icon'

describe('Icon', () => {
  it('announces itself as an image named by its label', () => {
    render(<Icon name="close" label="Close dialog" />)

    expect(screen.getByRole('img', { name: 'Close dialog' })).toBeInTheDocument()
  })

  it('names the control it is the only content of', () => {
    render(
      <button type="button">
        <Icon name="pencil" label="Rename view" />
      </button>,
    )

    // No aria-label on the button: the icon is what says what it does.
    expect(screen.getByRole('button', { name: 'Rename view' })).toBeInTheDocument()
  })

  it('says nothing where the meaning is already written beside it', () => {
    const { container } = render(
      <>
        <Icon name="arrow-left" label="Back" decorative />
        <span>Back to tickets</span>
      </>,
    )

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument()
  })

  it('takes its size from the scale rather than the surrounding text', () => {
    const { rerender } = render(<Icon name="close" label="Close" size="sm" />)

    expect(screen.getByRole('img', { name: 'Close' })).toHaveClass('size-4')

    rerender(<Icon name="close" label="Close" size="lg" />)

    expect(screen.getByRole('img', { name: 'Close' })).toHaveClass('size-6')
  })

  it('draws a different picture for a different name', () => {
    const { container: up } = render(<Icon name="arrow-up" label="Up" />)
    const { container: down } = render(<Icon name="arrow-down" label="Down" />)

    expect(up.innerHTML).not.toBe(down.innerHTML)
  })
})
