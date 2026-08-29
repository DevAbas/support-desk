import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from './ConfirmDialog'

const props = {
  open: true,
  title: 'Delete this ticket',
  description: 'TCK-0001 will be permanently removed. This cannot be undone.',
  confirmLabel: 'Delete ticket',
}

describe('ConfirmDialog', () => {
  it('asks the question and offers both answers', () => {
    render(<ConfirmDialog {...props} onClose={() => {}} onConfirm={() => {}} />)

    const dialog = screen.getByRole('dialog', { name: 'Delete this ticket' })

    expect(dialog).toHaveAccessibleDescription(
      'TCK-0001 will be permanently removed. This cannot be undone.',
    )
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete ticket' })).toBeInTheDocument()
  })

  it('confirms and cancels through the button that says so', async () => {
    const onConfirm = vi.fn()
    const onClose = vi.fn()
    render(<ConfirmDialog {...props} onClose={onClose} onConfirm={onConfirm} />)

    await userEvent.click(screen.getByRole('button', { name: 'Delete ticket' }))
    expect(onConfirm).toHaveBeenCalledOnce()
    expect(onClose).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('draws a destructive confirmation as destructive', () => {
    const { rerender } = render(
      <ConfirmDialog {...props} onClose={() => {}} onConfirm={() => {}} />,
    )

    expect(screen.getByRole('button', { name: 'Delete ticket' })).toHaveClass('bg-primary')

    rerender(<ConfirmDialog {...props} isDanger onClose={() => {}} onConfirm={() => {}} />)

    expect(screen.getByRole('button', { name: 'Delete ticket' })).toHaveClass('bg-danger')
  })

  it('closes itself down while the action is in flight', () => {
    render(
      <ConfirmDialog
        {...props}
        isBusy
        busyLabel="Deleting…"
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    )

    // Both, not just the one that was pressed: cancelling a request that is
    // already going is not something this can offer.
    expect(screen.getByRole('button', { name: 'Deleting…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })

  it('keeps the confirm label while busy when there is no busy label', () => {
    render(<ConfirmDialog {...props} isBusy onClose={() => {}} onConfirm={() => {}} />)

    expect(screen.getByRole('button', { name: 'Delete ticket' })).toBeDisabled()
  })

  it('renames the answers when the question is not a deletion', () => {
    render(
      <ConfirmDialog
        open
        title="Discard changes"
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    )

    expect(screen.getByRole('button', { name: 'Keep editing' })).toBeInTheDocument()
  })
})
