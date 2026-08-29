import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EMPTY_MESSAGE, LOADING_MESSAGE, StateMessage } from './StateMessage'

describe('StateMessage', () => {
  it('renders the message it is given', () => {
    render(<StateMessage>{EMPTY_MESSAGE}</StateMessage>)

    expect(screen.getByText('Nothing to show.')).toBeInTheDocument()
  })

  it('announces a wait, politely', () => {
    render(<StateMessage isLoading>{LOADING_MESSAGE}</StateMessage>)

    const status = screen.getByRole('status')

    expect(status).toHaveTextContent('Loading…')
    expect(status).toHaveAttribute('aria-live', 'polite')
  })

  it('does not announce an empty state', () => {
    render(<StateMessage>No tickets match this filter.</StateMessage>)

    // Nothing is happening; there is simply nothing there.
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('lets a caller override its padding without losing its type', () => {
    render(<StateMessage className="px-3 py-2 text-left">No saved views yet.</StateMessage>)

    const message = screen.getByText('No saved views yet.')

    expect(message).toHaveClass('px-3', 'py-2', 'text-left', 'text-body')
    expect(message).not.toHaveClass('px-4', 'py-12')
  })
})
