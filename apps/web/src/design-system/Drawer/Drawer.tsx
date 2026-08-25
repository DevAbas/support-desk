import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'
import { Button } from '@/design-system/Button'
import type { DrawerProps, DrawerSide } from './Drawer.types'

const sideClasses: Record<DrawerSide, string> = {
  right: 'right-0 border-l animate-slide-in-right',
  left: 'left-0 border-r animate-slide-in-left',
}

/**
 * A panel over the side of the screen, for looking at one thing without leaving
 * the list of things.
 *
 * It keeps `Modal`'s dialog contract — the same role, the same accessible name
 * from its title, the same Escape, the same focus moved in on open and restored
 * on close — because those are the parts a person relies on, and two dialogs
 * that dismiss differently is a bug in one of them.
 *
 * What differs is what it is for, and that is not a size prop. A modal
 * interrupts: it asks a question and will not go away until it is answered. A
 * drawer accompanies: the list it slid over is still there, still the thing
 * being worked through, and the drawer is expected to be opened and closed a
 * dozen times against it. That is why it is attached to an edge, why it slides
 * from that edge rather than appearing in the middle, and why it fills the
 * height it is given rather than sizing to its contents.
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
  const titleId = useId()
  const descriptionId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    panelRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      // Back to the row that opened it, so closing the drawer puts a keyboard
      // back where it was in the list rather than at the top of the document.
      previouslyFocused?.focus()
    }
  }, [open, onClose])

  if (!open) {
    return null
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 animate-fade-in bg-black/40 motion-reduce:animate-none"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          'fixed inset-y-0 flex w-full max-w-md flex-col border-border bg-surface shadow-overlay outline-none',
          // A preference for less motion is not a preference for no drawer, so
          // only the movement is dropped.
          'motion-reduce:animate-none',
          sideClasses[side],
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 id={titleId} className="truncate text-lg font-semibold text-fg">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="text-sm text-fg-muted">
                {description}
              </p>
            ) : null}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close drawer">
            &#215;
          </Button>
        </div>

        {/* The panel is as tall as the screen, so the part that scrolls is the
            contents rather than the whole drawer taking the header with it. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t border-border bg-surface-muted px-5 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  )
}
