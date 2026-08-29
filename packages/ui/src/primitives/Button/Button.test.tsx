import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('renders its label and defaults to type="button"', () => {
    render(<Button>Save ticket</Button>)

    expect(screen.getByRole('button', { name: 'Save ticket' })).toHaveAttribute('type', 'button')
  })

  it('applies the classes for the requested variant', () => {
    render(<Button variant="danger">Delete</Button>)

    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('bg-danger')
  })

  it('calls onClick when pressed', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Press me</Button>)

    await userEvent.click(screen.getByRole('button', { name: 'Press me' }))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('does not fire when disabled', async () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Press me
      </Button>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Press me' }))

    expect(onClick).not.toHaveBeenCalled()
  })
})
