import { cn } from '@support-desk/shared'
import { CardBody } from '../Card'
import { Dialog } from '../Dialog'
import type { DrawerProps, DrawerSide } from './Drawer.types'

const sideClasses: Record<DrawerSide, string> = {
  right: 'right-0 border-l animate-slide-in-right',
  left: 'left-0 border-r animate-slide-in-left',
}

/**
 * A panel over the side of the screen, for looking at one thing without leaving
 * the list of things.
 *
 * It keeps `Modal`'s dialog contract because both are `Dialog` — the same role,
 * the same accessible name from its title, the same Escape, the same focus moved
 * in on open, trapped while open and restored on close.
 *
 * What differs is what it is for, and that is not a size prop. A modal
 * interrupts: it asks a question and will not go away until it is answered. A
 * drawer accompanies: the list it slid over is still there, still the thing
 * being worked through, and the drawer is expected to be opened and closed a
 * dozen times against it. That is why it is attached to an edge, why it slides
 * from that edge rather than appearing in the middle, why it fills the height it
 * is given rather than sizing to its contents — and so why the part that scrolls
 * is its body rather than the whole panel taking the header with it.
 */
export function Drawer({
  open,
  onClose,
  title,
  description,
  side = 'right',
  children,
  footer,
  className,
}: DrawerProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      closeLabel="Close drawer"
      // A fixed width with a person's name in it cannot grow to fit them.
      truncateTitle
      overlayClassName="animate-fade-in motion-reduce:animate-none"
      panelClassName={cn(
        'fixed inset-y-0 flex w-full max-w-md flex-col border-border bg-surface shadow-overlay',
        // A preference for less motion is not a preference for no drawer, so
        // only the movement is dropped.
        'motion-reduce:animate-none',
        sideClasses[side],
        className,
      )}
      footer={footer}
    >
      <CardBody className="min-h-0 flex-1 overflow-y-auto">{children}</CardBody>
    </Dialog>
  )
}
