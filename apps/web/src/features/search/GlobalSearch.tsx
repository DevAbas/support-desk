import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, CommandPalette, Icon } from '@harness-sample/ui'
import { navigationTargetsFor } from '@harness-sample/shared'
import { toErrorMessage } from '@/lib/api/http'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { useRole } from '@/features/roles/useRole'
import { useGlobalSearch } from './hooks/useGlobalSearch'
import { toPaletteContents, toScreenContents } from './searchResults'
import { SEARCH_SHORTCUT_HINT } from './searchShortcut'
import { useSearchShortcut } from './useSearchShortcut'

/**
 * One way in to everything the app knows about.
 *
 * The control and the palette are one component on purpose: they are one
 * feature, they share the open state, and a header that owned the button while
 * something else owned the panel would be two places to keep one thing in step.
 * `AppLayout` renders this and says nothing about search.
 *
 * **Three things about how it behaves are decisions rather than defaults.**
 *
 * *Nothing typed shows the screens.* It is the only group whose whole set is
 * small enough to list honestly, it needs no request, and it teaches what the
 * palette is for — see `toScreenContents` for why it is not recent items.
 *
 * *Typing waits for a pause.* The field is instant and the request is not, which
 * is the pattern the customers toolbar established: one request per word, not
 * one per keystroke, and the cache key is built from the settled term.
 *
 * *Results already on screen stay there while the next ones load.* A palette
 * that blanks between keystrokes cannot be read while typing, so the loading
 * state is only shown when there is genuinely nothing to show yet.
 */

/** The same pause the two list screens use. Long enough to be one request. */
const SEARCH_DEBOUNCE_MS = 250

const LABEL = 'Search'

const PLACEHOLDER = 'Tickets, customers and screens'

export function GlobalSearch() {
  const navigate = useNavigate()
  const { role } = useRole()

  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')

  const term = query.trim()
  const settledTerm = useDebouncedValue(term, SEARCH_DEBOUNCE_MS)
  const results = useGlobalSearch(settledTerm, isOpen)

  const open = useCallback(() => setIsOpen(true), [])

  useSearchShortcut(open)

  // Before anything is typed the palette is a menu of the screens this role can
  // reach; after that it is whatever the server found.
  const { groups, destinations } =
    term === ''
      ? toScreenContents(navigationTargetsFor(role))
      : toPaletteContents(results.data?.groups ?? [])

  const hasResults = groups.some((group) => group.options.length > 0)

  /**
   * Waiting, rather than fetching.
   *
   * True while typing has not settled as well as while the request is out,
   * because both are the same thing to the person watching — and false as soon
   * as there is anything to show, so the previous answer stays on screen instead
   * of being replaced by a spinner between keystrokes.
   */
  const isLoading = term !== '' && !hasResults && (term !== settledTerm || results.isFetching)

  const error = results.isError ? toErrorMessage(results.error, 'Could not search.') : null

  /**
   * Stable, and it has to be.
   *
   * `Dialog` moves focus into its panel whenever `onClose` changes identity, so
   * a new closure on every render would take focus off the field each time the
   * debounce settled — mid-word, while somebody is typing into it.
   *
   * A palette opened again is a new question, so the term goes with it: the old
   * results would otherwise be the first thing on screen, under a field that has
   * been emptied to match.
   */
  const close = useCallback(() => {
    setIsOpen(false)
    setQuery('')
  }, [])

  function select(optionId: string) {
    const destination = destinations.get(optionId)

    if (destination === undefined) {
      return
    }

    close()
    navigate(destination)
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={open}>
        <Icon name="search" size="sm" label={LABEL} decorative />
        {LABEL}
        {/* Hidden from a reader, which already has the button's name and a
            keyboard hint inside the palette itself. This is for the eye that
            has not found the shortcut yet — and it is `fg-muted` rather than
            `fg-subtle`, which is 3.6:1 on a card and not a colour for text. */}
        <span aria-hidden="true" className="text-caption text-fg-muted">
          {SEARCH_SHORTCUT_HINT}
        </span>
      </Button>

      <CommandPalette
        open={isOpen}
        onClose={close}
        label={LABEL}
        placeholder={PLACEHOLDER}
        value={query}
        onValueChange={setQuery}
        groups={groups}
        onSelect={select}
        isLoading={isLoading}
        loadingMessage="Searching…"
        emptyMessage={`Nothing matches "${term}".`}
        error={error}
      />
    </>
  )
}
