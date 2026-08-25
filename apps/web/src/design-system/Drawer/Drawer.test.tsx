import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Drawer } from './Drawer'

describe('Drawer', () => {
  it('renders nothing while closed', () => {
    render(
      <Drawer open={false} onClose={() => {}} title="Priya Raman">
        Body
      </Drawer>,
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('exposes its title as the accessible name', () => {
    render(
      <Drawer open onClose={() => {}} title="Priya Raman" description="Northwind Labs">
        Body
      </Drawer>,
    )

    const drawer = screen.getByRole('dialog', { name: 'Priya Raman' })

    expect(drawer).toHaveAttribute('aria-modal', 'true')
    expect(drawer).toHaveAccessibleDescription('Northwind Labs')
  })

  it('closes on Escape', async () => {
    const onClose = vi.fn()
    render(
      <Drawer open onClose={onClose} title="Priya Raman">
        Body
      </Drawer>,
    )

    await userEvent.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes when the close button is pressed', async () => {
    const onClose = vi.fn()
    render(
      <Drawer open onClose={onClose} title="Priya Raman">
        Body
      </Drawer>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Close drawer' }))

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes when the screen behind it is clicked', async () => {
    const onClose = vi.fn()
    const { container } = render(
      <Drawer open onClose={onClose} title="Priya Raman">
        Body
      </Drawer>,
    )

    // The panel itself is not a way out: only the part of the overlay the panel
    // does not cover dismisses it.
    await userEvent.click(screen.getByRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()

    const overlay = document.body.querySelector('.fixed.inset-0')
    expect(overlay).not.toBe(null)
    expect(container).toBeEmptyDOMElement()

    await userEvent.click(overlay as HTMLElement)

    expect(onClose).toHaveBeenCalledOnce()
  })

  it('takes focus on open and gives it back on close', async () => {
    function Screen({ open }: { open: boolean }) {
      return (
        <>
          <button type="button">Priya Raman</button>
          <Drawer open={open} onClose={() => {}} title="Priya Raman">
            Body
          </Drawer>
        </>
      )
    }

    const { rerender } = render(<Screen open={false} />)

    const row = screen.getByRole('button', { name: 'Priya Raman' })
    await userEvent.click(row)

    rerender(<Screen open />)
    expect(screen.getByRole('dialog')).toHaveFocus()

    rerender(<Screen open={false} />)
    // Back to the row that opened it, rather than the top of the document.
    expect(row).toHaveFocus()
  })

  it('slides in from the side it is attached to', () => {
    const { rerender } = render(
      <Drawer open onClose={() => {}} title="Priya Raman">
        Body
      </Drawer>,
    )

    expect(screen.getByRole('dialog')).toHaveClass('animate-slide-in-right')

    rerender(
      <Drawer open onClose={() => {}} title="Priya Raman" side="left">
        Body
      </Drawer>,
    )

    expect(screen.getByRole('dialog')).toHaveClass('animate-slide-in-left')
  })

  it('renders a footer only when it is given one', () => {
    const { rerender } = render(
      <Drawer open onClose={() => {}} title="Priya Raman">
        Body
      </Drawer>,
    )

    expect(screen.queryByRole('button', { name: 'View tickets' })).not.toBeInTheDocument()

    rerender(
      <Drawer
        open
        onClose={() => {}}
        title="Priya Raman"
        footer={<button type="button">View tickets</button>}
      >
        Body
      </Drawer>,
    )

    expect(screen.getByRole('button', { name: 'View tickets' })).toBeInTheDocument()
  })
})
