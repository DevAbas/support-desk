import { useState } from 'react'
import type { Ticket } from '@support-desk/shared'

export interface TicketSelection {
  /** The ticked ids that are still on the page being shown. */
  selectedIds: string[]
  toggle: (id: string) => void
  toggleAll: (selected: boolean) => void
  /**
   * Drops these ids and keeps everything else ticked.
   *
   * What a finished bulk action calls with the ids it actually acted on. A
   * request is in flight for a while: anything ticked in the meantime was not
   * part of what was done, and a ticket the action was refused for is the one
   * still needing something doing to it.
   */
  drop: (ids: readonly string[]) => void
  clear: () => void
}

/**
 * A ticket selection, bounded by the page it was made on.
 *
 * `selectedIds` is derived on every render rather than stored, so the selection
 * cannot go stale: rows that are no longer on screen, and any selection at all
 * once the permission is lost, drop out without an effect having to reset them.
 * The stored list is deliberately the wider one — a ticket ticked, paged away
 * from and paged back to is still ticked.
 *
 * A hook rather than four functions in `TicketListPage`, because that component
 * is a single function at the edge of two of the repository's thresholds and
 * this is the part of it that is about neither filtering nor rendering. The
 * customer list keeps its own, and deliberately: a customer selection spans
 * every page loaded so far, which is a different rule rather than this one with
 * a flag.
 */
export function useTicketSelection(
  rows: readonly Ticket[],
  canSelect: boolean,
): TicketSelection {
  const [selection, setSelection] = useState<string[]>([])

  return {
    selectedIds: canSelect
      ? selection.filter((id) => rows.some((ticket) => ticket.id === id))
      : [],

    toggle(id) {
      setSelection((current) =>
        current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
      )
    },

    toggleAll(selected) {
      setSelection(selected ? rows.map((ticket) => ticket.id) : [])
    },

    drop(ids) {
      setSelection((current) => current.filter((id) => !ids.includes(id)))
    },

    clear() {
      setSelection([])
    },
  }
}
