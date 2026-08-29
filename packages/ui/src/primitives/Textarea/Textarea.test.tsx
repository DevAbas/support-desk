import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Textarea } from './Textarea'

describe('Textarea', () => {
  it('binds the label to the control', () => {
    render(<Textarea label="Description" />)

    expect(screen.getByLabelText('Description')).toBeInTheDocument()
  })

  it('describes the control with both the hint and the error', () => {
    render(<Textarea label="Description" hint="Markdown is supported" error="Too short" />)

    expect(screen.getByLabelText('Description')).toHaveAccessibleDescription(
      'Markdown is supported Too short',
    )
  })
})
