import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Checkbox } from './Checkbox'

describe('Checkbox', () => {
  it('names the control from its label', () => {
    render(<Checkbox label="Enterprise" checked={false} onChange={() => undefined} />)

    expect(screen.getByRole('checkbox', { name: 'Enterprise' })).toBeInTheDocument()
  })

  it('makes the words a click target as well as the box', async () => {
    const onChange = vi.fn()
    render(<Checkbox label="Enterprise" checked={false} onChange={onChange} />)

    await userEvent.click(screen.getByText('Enterprise'))

    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('names the control without drawing the words when the label is hidden', () => {
    render(
      <Checkbox
        label="Select ticket T-1"
        labelHidden
        checked={false}
        onChange={() => undefined}
      />,
    )

    expect(screen.getByRole('checkbox', { name: 'Select ticket T-1' })).toBeInTheDocument()
    expect(screen.queryByText('Select ticket T-1')).not.toBeInTheDocument()
  })

  it('says "some of these" without saying "all of these"', () => {
    render(
      <Checkbox
        label="Select all tickets on this page"
        labelHidden
        indeterminate
        checked={false}
        onChange={() => undefined}
      />,
    )

    const box = screen.getByRole('checkbox', { name: 'Select all tickets on this page' })

    expect(box).toBePartiallyChecked()
    expect(box).not.toBeChecked()
  })

  // The property has no attribute, so nothing re-renders it away: it has to be
  // written back to the node when the answer changes.
  it('clears the mixed state when it is no longer mixed', () => {
    const { rerender } = render(
      <Checkbox label="Select all" labelHidden indeterminate checked={false} onChange={() => undefined} />,
    )

    rerender(
      <Checkbox label="Select all" labelHidden checked onChange={() => undefined} />,
    )

    const box = screen.getByRole('checkbox', { name: 'Select all' })

    expect(box).not.toBePartiallyChecked()
    expect(box).toBeChecked()
  })

  it('carries the disabled treatment', () => {
    render(<Checkbox label="Enterprise" disabled checked={false} onChange={() => undefined} />)

    const box = screen.getByRole('checkbox', { name: 'Enterprise' })

    expect(box).toBeDisabled()
    expect(box).toHaveClass('disabled:opacity-50')
  })
})
