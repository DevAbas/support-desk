import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Dialog } from './Dialog'

function renderDialog(onClose = vi.fn()) {
  render(
    <>
      <button type="button">Behind the dialog</button>
      <Dialog open onClose={onClose} title="Delete ticket" closeLabel="Close dialog">
        <button type="button">First</button>
        <button type="button">Second</button>
      </Dialog>
    </>,
  )

  return onClose
}

describe('Dialog', () => {
  it('renders nothing while closed', () => {
    render(<Dialog open={false} onClose={() => {}} title="Delete ticket" closeLabel="Close dialog" />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('names and describes itself from its title and description', () => {
    render(
      <Dialog
        open
        onClose={() => {}}
        title="Delete ticket"
        description="This cannot be undone."
        closeLabel="Close dialog"
      />,
    )

    const dialog = screen.getByRole('dialog', { name: 'Delete ticket' })

    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleDescription('This cannot be undone.')
  })

  it('closes on Escape, on the close button, and on the screen behind it', async () => {
    const onClose = vi.fn()
    render(<Dialog open onClose={onClose} title="Delete ticket" closeLabel="Close dialog" />)

    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)

    await userEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
    expect(onClose).toHaveBeenCalledTimes(2)

    const overlay = document.body.querySelector('.fixed.inset-0')
    await userEvent.click(overlay as HTMLElement)
    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('is not dismissed by a click on the panel itself', async () => {
    const onClose = vi.fn()
    render(<Dialog open onClose={onClose} title="Delete ticket" closeLabel="Close dialog" />)

    await userEvent.click(screen.getByRole('dialog'))

    expect(onClose).not.toHaveBeenCalled()
  })

  it('keeps Tab inside itself, forwards', async () => {
    renderDialog()

    // `aria-modal` says the page behind is not there; the trap is what makes
    // that true rather than merely announced. The close button is first because
    // the header is first.
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus()

    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus()

    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Second' })).toHaveFocus()

    // Off the end, and back to the top of the dialog rather than out of it.
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus()
  })

  it('keeps Tab inside itself, backwards', async () => {
    renderDialog()

    // Shift+Tab off the panel would land on the page behind it; it wraps to the
    // last thing in the dialog instead.
    await userEvent.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Second' })).toHaveFocus()

    await userEvent.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'First' })).toHaveFocus()

    await userEvent.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus()
  })

  it('never lets focus reach the page behind it', async () => {
    renderDialog()

    const behind = screen.getByRole('button', { name: 'Behind the dialog' })

    for (let step = 0; step < 8; step += 1) {
      await userEvent.tab()
      expect(behind).not.toHaveFocus()
    }
  })

  it('holds focus on itself when there is nothing in it to focus', async () => {
    render(
      <>
        <button type="button">Behind the dialog</button>
        <Dialog open onClose={() => {}} title="Working…" closeLabel="Close dialog" />
      </>,
    )

    // Only the close button, so every Tab lands back on it.
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus()

    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus()
  })

  it('takes focus on open and gives it back on close', async () => {
    function Screen({ open }: { open: boolean }) {
      return (
        <>
          <button type="button">Delete ticket</button>
          <Dialog open={open} onClose={() => {}} title="Delete ticket" closeLabel="Close dialog" />
        </>
      )
    }

    const { rerender } = render(<Screen open={false} />)

    const trigger = screen.getByRole('button', { name: 'Delete ticket' })
    await userEvent.click(trigger)

    rerender(<Screen open />)
    expect(screen.getByRole('dialog')).toHaveFocus()

    rerender(<Screen open={false} />)
    expect(trigger).toHaveFocus()
  })

  it('renders its header and footer through Card, not a second copy of them', () => {
    render(
      <Dialog
        open
        onClose={() => {}}
        title="Delete ticket"
        closeLabel="Close dialog"
        footer={<button type="button">Delete</button>}
      >
        <p>Body</p>
      </Dialog>,
    )

    expect(screen.getByRole('heading', { level: 2, name: 'Delete ticket' })).toHaveClass(
      'text-section',
    )
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })
})
