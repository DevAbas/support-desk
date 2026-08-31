import { useEffect } from 'react'
import { matchesSearchShortcut } from './searchShortcut'

/**
 * Opens the search from anywhere.
 *
 * On `window` rather than on a container, because "from anywhere" is the whole
 * requirement: the shortcut has to work with the caret in the ticket filter, in
 * a comment box, or nowhere at all. `preventDefault` is not optional — Firefox
 * gives Ctrl+K to the address bar, and a shortcut that also focuses the browser
 * chrome is a shortcut that opens the palette behind something else.
 */
export function useSearchShortcut(onOpen: () => void): void {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!matchesSearchShortcut(event)) {
        return
      }

      event.preventDefault()
      onOpen()
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onOpen])
}
