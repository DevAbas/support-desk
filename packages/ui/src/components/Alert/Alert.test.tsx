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

  it('is a callout on its own by default', () => {
    render(<Alert tone="danger">Something broke.</Alert>)

    expect(screen.getByRole('alert')).toHaveClass('rounded-md', 'border', 'px-4', 'py-3')
  })

  it('carries no chrome of its own inline', () => {
    render(
      <Alert tone="danger" variant="inline">
        The export failed.
      </Alert>,
    )

    const alert = screen.getByRole('alert')

    // The tone is what is being reused here, so the text keeps it while the
    // fill, the border and the padding go.
    expect(alert).toHaveClass('bg-transparent', 'p-0', 'text-danger-subtle-fg')
    expect(alert).not.toHaveClass('bg-danger-subtle')
    expect(alert).not.toHaveClass('rounded-md')
  })

  it('spans a card edge to edge as a band', () => {
    render(
      <Alert tone="danger" variant="band">
        Could not load tickets.
      </Alert>,
    )

    const alert = screen.getByRole('alert')

    // A bottom edge and nothing else: no rounding, no sides, no top.
    expect(alert).toHaveClass('border-b', 'bg-danger-subtle', 'px-4', 'py-3')
    expect(alert).not.toHaveClass('rounded-md')
    expect(alert).not.toHaveClass('border')
  })

  it('keeps the role its tone chose whatever shape it takes', () => {
    const { rerender } = render(
      <Alert tone="danger" variant="inline">
        Something broke.
      </Alert>,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()

    rerender(
      <Alert tone="success" variant="band">
        All done.
      </Alert>,
    )

    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
