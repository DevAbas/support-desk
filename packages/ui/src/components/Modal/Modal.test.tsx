import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

describe('Modal', () => {
  it('renders nothing while closed', () => {
    render(
      <Modal open={false} onClose={() => {}} title="Delete ticket">
        Body
      </Modal>,
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('exposes its title as the accessible name', () => {
    render(
      <Modal open onClose={() => {}} title="Delete ticket" description="This cannot be undone.">
        Body
      </Modal>,
    )

    const dialog = screen.getByRole('dialog', { name: 'Delete ticket' })

    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleDescription('This cannot be undone.')
  })

  it('closes on Escape', async () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Delete ticket">
        Body
      </Modal>,
    )

    await userEvent.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('keeps focus inside itself', async () => {
    render(
      <>
        <button type="button">Behind the modal</button>
        <Modal open onClose={() => {}} title="Delete ticket" footer={<button type="button">Delete</button>}>
          <button type="button">Body control</button>
        </Modal>
      </>,
    )

    const behind = screen.getByRole('button', { name: 'Behind the modal' })

    for (let step = 0; step < 6; step += 1) {
      await userEvent.tab()
      expect(behind).not.toHaveFocus()
    }
  })

  it('closes when the close button is pressed', async () => {
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Delete ticket">
        Body
      </Modal>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Close dialog' }))

    expect(onClose).toHaveBeenCalledOnce()
  })
})
