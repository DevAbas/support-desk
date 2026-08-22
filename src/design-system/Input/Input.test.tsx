import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Input } from './Input'

describe('Input', () => {
  it('binds the label to the control', async () => {
    render(<Input label="Assignee" />)

    const field = screen.getByLabelText('Assignee')
    await userEvent.type(field, 'Dana')

    expect(field).toHaveValue('Dana')
  })

  it('marks the field invalid and describes it when there is an error', () => {
    render(<Input label="Title" error="Title is required" />)

    const field = screen.getByLabelText('Title')

    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(field).toHaveAccessibleDescription('Title is required')
  })

  it('has no aria-invalid when valid', () => {
    render(<Input label="Title" />)

    expect(screen.getByLabelText('Title')).not.toHaveAttribute('aria-invalid')
  })
})
