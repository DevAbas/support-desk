import { cn } from '@harness-sample/shared'
import { CardBody } from '../Card'
import { Dialog } from '../Dialog'
import type { ModalProps } from './Modal.types'

/**
 * A dialog in the middle of the screen, for a question that has to be answered.
 *
 * It shares `Dialog` with `Drawer` — the role, the name, Escape, the overlay
 * click, the focus trap, focus restored to the trigger — and differs in the two
 * ways a modal actually differs: it sits in the centre rather than on an edge,
 * and it is as tall as what is in it, so there is nothing to scroll and no body
 * at all when it is only a question.
 */
export function Modal({ open, onClose, title, description, children, footer, className }: ModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      closeLabel="Close dialog"
      overlayClassName="flex items-center justify-center p-4"
      panelClassName={cn(
        'w-full max-w-lg rounded-container border border-border bg-surface shadow-overlay',
        className,
      )}
      footer={footer}
    >
      {children ? <CardBody>{children}</CardBody> : null}
    </Dialog>
  )
}
