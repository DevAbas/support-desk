import { useEffect, type RefObject } from 'react'

/**
 * What Tab can reach. Anything explicitly taken out of the tab order is left
 * out, which includes the panel itself.
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

function focusableWithin(panel: HTMLElement): HTMLElement[] {
  return [...panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
    (element) =>
      !element.hasAttribute('disabled') &&
      !element.hasAttribute('hidden') &&
      element.closest('[aria-hidden="true"]') === null,
  )
}

/**
 * Keeps Tab inside an open dialog.
 *
 * `aria-modal="true"` tells assistive technology that everything behind the
 * dialog is inert. Without a trap that is simply untrue: Tab walks straight out
 * into a page the reader has been told is not there, and there is no way back in
 * except by finding the dialog again. The attribute and the trap are one claim,
 * and it was only half made.
 *
 * Only the wrap is intercepted. Tab from the panel into its own first control,
 * and every step in between, is the browser's own behaviour and stays that way.
 *
 * The listener is on the panel rather than on the document, so a dialog opened
 * over another dialog traps its own Tab and not the one underneath it.
 */
export function useFocusTrap(panelRef: RefObject<HTMLElement | null>, active: boolean): void {
  useEffect(() => {
    const panel = panelRef.current

    if (!active || panel === null) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Tab' || panel === null) {
        return
      }

      const focusable = focusableWithin(panel)
      const first = focusable.at(0)
      const last = focusable.at(-1)
      const focused = document.activeElement

      if (first === undefined || last === undefined) {
        // A dialog with nothing to focus still has somewhere for focus to be.
        event.preventDefault()
        panel.focus()
        return
      }

      if (event.shiftKey && (focused === first || focused === panel)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && focused === last) {
        event.preventDefault()
        first.focus()
      }
    }

    panel.addEventListener('keydown', handleKeyDown)

    return () => {
      panel.removeEventListener('keydown', handleKeyDown)
    }
  }, [panelRef, active])
}
