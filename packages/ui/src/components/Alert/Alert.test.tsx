import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Alert } from './Alert'

describe('Alert', () => {
  it('renders a title, a message and an action', () => {
    render(
      <Alert title="Could not load the report" action={<span>action slot</span>}>
        The server did not answer.
      </Alert>,
    )

    expect(screen.getByText('Could not load the report')).toBeInTheDocument()
    expect(screen.getByText('The server did not answer.')).toBeInTheDocument()
    expect(screen.getByText('action slot')).toBeInTheDocument()
  })

  it('announces a failure assertively and everything else politely', () => {
    const { rerender } = render(<Alert tone="danger">Something broke.</Alert>)

    expect(screen.getByRole('alert')).toHaveTextContent('Something broke.')

    rerender(<Alert tone="success">All done.</Alert>)

    expect(screen.getByRole('status')).toHaveTextContent('All done.')
  })

  it('applies the classes for the requested tone', () => {
    render(<Alert tone="warning">Careful.</Alert>)

    expect(screen.getByRole('status')).toHaveClass('bg-warning-subtle')
  })

  it('falls back to the info tone', () => {
    render(<Alert>Just so you know.</Alert>)

    expect(screen.getByRole('status')).toHaveClass('bg-info-subtle')
  })
})
