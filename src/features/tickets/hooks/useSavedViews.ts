import { useCallback, useState } from 'react'
import { createSavedView, readSavedViews, writeSavedViews, type SavedView } from '../savedViews'
import type { TicketFilters } from '../ticketFilters'

interface UseSavedViewsResult {
  views: SavedView[]
  /** Returns the new view so the caller can make it the active one. */
  saveView: (name: string, filters: TicketFilters) => SavedView
  renameView: (id: string, name: string) => void
  deleteView: (id: string) => void
}

/**
 * The saved views a person has, mirrored into localStorage on every change.
 *
 * The hook owns the collection and nothing else: which view is active, and
 * whether the filters on screen still match it, belong to the screen — see
 * `TicketListPage`.
 */
export function useSavedViews(): UseSavedViewsResult {
  // Read once, lazily: storage is synchronous and only changes through here.
  const [views, setViews] = useState<SavedView[]>(readSavedViews)

  const commit = useCallback((next: SavedView[]) => {
    setViews(next)
    writeSavedViews(next)
  }, [])

  const saveView = useCallback(
    (name: string, filters: TicketFilters) => {
      const view = createSavedView(name, filters)
      commit([...views, view])
      return view
    },
    [commit, views],
  )

  const renameView = useCallback(
    (id: string, name: string) => {
      commit(views.map((view) => (view.id === id ? { ...view, name: name.trim() } : view)))
    },
    [commit, views],
  )

  const deleteView = useCallback(
    (id: string) => {
      commit(views.filter((view) => view.id !== id))
    },
    [commit, views],
  )

  return { views, saveView, renameView, deleteView }
}
