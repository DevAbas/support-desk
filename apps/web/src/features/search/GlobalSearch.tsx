import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, CommandPalette, Icon } from '@harness-sample/ui'
import { navigationTargetsFor, type SearchResponse } from '@harness-sample/shared'
import { toErrorMessage } from '@/lib/api/http'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import type { Role } from '@/features/roles/role.types'
import { useRole } from '@/features/roles/useRole'
import { useGlobalSearch } from './hooks/useGlobalSearch'
import { toPaletteContents, toScreenContents, type PaletteContents } from './searchResults'
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
 * state is only shown when there is genuinely nothing to show yet — and only
 * within one opening of the palette, which is what `opening` below is for.
 */

/** The same pause the two list screens use. Long enough to be one request. */
const SEARCH_DEBOUNCE_MS = 250

const LABEL = 'Search'

const PLACEHOLDER = 'Tickets, customers and screens'

/** Typed, but not yet a question: there is nothing honest to show. */
const NOTHING_YET = toPaletteContents([])

/**
 * What the palette is showing, which is the answer to the term that has
 * *settled* rather than to the one being typed.
 *
 * That distinction is the whole of it. The query behind this keeps its previous
 * answer — the reason the panel does not blank between keystrokes — so a palette
 * closed on a search and opened again is still holding that search's results.
 * Reading them against the live term put them back on screen the moment a letter
 * was typed: selectable, with no loading state over them, for the length of the
 * debounce, and Enter inside that window went to a result of a search that had
 * already been dismissed.
 */
function paletteContents(
  term: string,
  settledTerm: string,
  role: Role,
  found: SearchResponse | undefined,
): PaletteContents {
  // Nothing typed: the screens this role can reach, as a menu.
  if (term === '') {
    return toScreenContents(navigationTargetsFor(role))
  }

  // Typed, and nothing has been asked yet — so nothing has been answered.
  if (settledTerm === '') {
    return NOTHING_YET
  }

  return toPaletteContents(found?.groups ?? [])
}

export function GlobalSearch() {
  const navigate = useNavigate()
  const { role } = useRole()

  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  /**
   * Which opening of the palette the settled term belongs to.
   *
   * `close` empties the field, but the debounce behind it goes on holding the
   * term of the search just dismissed for another `SEARCH_DEBOUNCE_MS` — which
   * is long enough to reopen the palette and type into it. Stamping the opening
   * onto the value being debounced is what keeps the two in step: a term that
   * settled under an earlier opening is not this opening's question, so it reads
   * as nothing asked rather than as an answer.
   */
  const [opening, setOpening] = useState(0)

  const term = query.trim()
  const pending = useMemo(() => ({ opening, term }), [opening, term])
  const settled = useDebouncedValue(pending, SEARCH_DEBOUNCE_MS)
  const settledTerm = settled.opening === opening ? settled.term : ''
  const results = useGlobalSearch(settledTerm, isOpen)

  const open = useCallback(() => setIsOpen(true), [])

  useSearchShortcut(open)

  const { groups, destinations } = paletteContents(term, settledTerm, role, results.data)

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
   * been emptied to match. Emptying the field is not enough on its own — the
   * debounce and the query behind it both outlive the closing — which is why the
   * opening is counted off here too.
   */
  const close = useCallback(() => {
    setIsOpen(false)
    setQuery('')
    setOpening((previous) => previous + 1)
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
