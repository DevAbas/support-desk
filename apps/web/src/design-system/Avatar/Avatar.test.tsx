import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Avatar } from './Avatar'

const PICTURE = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%2F%3E'

describe('Avatar', () => {
  it('draws initials when there is no picture', () => {
    render(<Avatar name="Priya Raman" />)

    expect(screen.getByRole('img', { name: 'Priya Raman' })).toHaveTextContent('PR')
  })

  it('takes the first and last word, however many are in between', () => {
    render(<Avatar name="Tomas van der Lindqvist" />)

    expect(screen.getByRole('img', { name: 'Tomas van der Lindqvist' })).toHaveTextContent('TL')
  })

  it('draws a single letter for a one-word name', () => {
    render(<Avatar name="Prince" />)

    expect(screen.getByRole('img', { name: 'Prince' })).toHaveTextContent('P')
  })

  it('shows the picture when there is one, named after the person', () => {
    render(<Avatar name="Priya Raman" src={PICTURE} />)

    expect(screen.getByRole('img', { name: 'Priya Raman' })).toHaveAttribute('src', PICTURE)
  })

  it('falls back to initials when the picture will not load', () => {
    render(<Avatar name="Priya Raman" src={PICTURE} />)

    fireEvent.error(screen.getByRole('img', { name: 'Priya Raman' }))

    const fallback = screen.getByRole('img', { name: 'Priya Raman' })
    expect(fallback).toHaveTextContent('PR')
    expect(fallback.tagName).toBe('SPAN')
  })

  it('tries a new picture even after an earlier one failed', () => {
    const { rerender } = render(<Avatar name="Priya Raman" src={PICTURE} />)

    fireEvent.error(screen.getByRole('img', { name: 'Priya Raman' }))
    expect(screen.getByRole('img', { name: 'Priya Raman' }).tagName).toBe('SPAN')

    rerender(<Avatar name="Priya Raman" src={`${PICTURE}%20`} />)

    expect(screen.getByRole('img', { name: 'Priya Raman' }).tagName).toBe('IMG')
  })

  it('hides itself where the name is already written beside it', () => {
    const { container } = render(
      <>
        <Avatar name="Priya Raman" decorative />
        <span>Priya Raman</span>
      </>,
    )

    // Nothing announced: the name is read once, from the text next to it.
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent('PR')
  })

  it('hides a decorative picture from assistive technology too', () => {
    render(<Avatar name="Priya Raman" src={PICTURE} decorative />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })

  it('gives the same person the same tone every time', () => {
    const { container: first } = render(<Avatar name="Priya Raman" />)
    const { container: second } = render(<Avatar name="Priya Raman" />)
    const { container: other } = render(<Avatar name="Marco Ellis" />)

    const toneOf = (container: HTMLElement) => container.firstElementChild?.className

    expect(toneOf(first)).toBe(toneOf(second))
    expect(toneOf(first)).not.toBe(toneOf(other))
  })

  it('merges an incoming className over its own', () => {
    const { container } = render(<Avatar name="Priya Raman" size="lg" className="size-20" />)

    expect(container.firstElementChild).toHaveClass('size-20')
    expect(container.firstElementChild).not.toHaveClass('size-14')
  })
})
