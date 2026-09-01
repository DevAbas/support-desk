import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@support-desk/shared'
import { Button } from '../../primitives/Button'
import { Icon } from '../../primitives/Icon'
import { CardFooter, CardHeader } from '../Card'
import { useFocusTrap } from './useFocusTrap'
import type { DialogProps } from './Dialog.types'

/**
 * The dialog contract, in one place.
 *
 * `Modal` and `Drawer` are still two components — a modal interrupts and a
 * drawer accompanies, which is not a size prop — but everything a person relies
 * on is the same in both, and it was written twice. The role, the accessible
 * name taken from the title, the description wired through `aria-describedby`,
 * Escape, the click on the overlay, focus moved in on open and handed back to
 * the trigger on close, and now the trap: all of it lives here, so a dialog bug
 * is fixed once rather than in whichever of the two someone noticed it in.
 *
 * What is left to the caller is what actually differs: where the panel sits, how
 * it arrives, what scrolls inside it, and — for a panel whose top is a control
 * rather than a heading — what the header is. `header` replaces the chrome and
 * not the contract: `title` is still what names the dialog, rendered visually
 * hidden instead of drawn.
 *
 * The header and footer are `CardHeader` and `CardFooter` rather than the same
 * class strings written out again — which is what they were.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  closeLabel,
  overlayClassName,
  panelClassName,
  truncateTitle = false,
  header,
  children,
  footer,
}: DialogProps) {
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
      // Back to whatever opened it, so closing puts a keyboard where it was
      // rather than at the top of the document.
      previouslyFocused?.focus()
    }
  }, [open, onClose])

  useFocusTrap(panelRef, open)

  if (!open) {
    return null
  }

  return createPortal(
    <div
      className={cn('fixed inset-0 z-50 bg-black/40', overlayClassName)}
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
        className={cn('outline-none', panelClassName)}
      >
        {header === undefined ? (
          <CardHeader
            title={title}
            description={description}
            titleId={titleId}
            descriptionId={descriptionId}
            truncateTitle={truncateTitle}
            actions={
              <Button variant="ghost" size="sm" onClick={onClose} aria-label={closeLabel}>
                <Icon name="close" size="sm" label={closeLabel} decorative />
              </Button>
            }
          />
        ) : (
          <>
            {/* The name and the description still exist, they are just not
                drawn — `aria-labelledby` and `aria-describedby` above point at
                these, so a dialog with its own header is named the same way one
                with a `CardHeader` is. */}
            <div className="sr-only">
              <h2 id={titleId}>{title}</h2>
              {description ? <p id={descriptionId}>{description}</p> : null}
            </div>
            {header}
          </>
        )}

        {children}

        {footer ? <CardFooter>{footer}</CardFooter> : null}
      </div>
    </div>,
    document.body,
  )
}
