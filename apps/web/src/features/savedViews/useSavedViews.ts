import { useState } from 'react'
import { createSavedView, readSavedViews, writeSavedViews } from './savedViewStorage'
import { sameFilters } from './sameFilters'
import type { SavedView, SavedViewScope, SavedViewsPanel } from './savedViews.types'

/**
 * The saved views on one screen: the collection, which of them is selected, and
 * whether the filters on screen still match it.
 *
 * The three are held together because they are one idea: a view is selected,
 * until the filters drift from it, until it is saved over or another is chosen.
 * On the ticket queue they were split — a hook that held only the collection,
 * and the screen working out selection and drift beside its own state — and a
 * mechanism that kept only the list would have left every screen to assemble the
 * other two for itself. Holding all three is what makes a scope enough.
 *
 * What is left to the screen is `onApply`, and only that. Filters are the
 * screen's state — the list query is built from them, the search field is
 * debounced off them — and taking a view's filters means whatever else that
 * screen does when its filters change: the ticket queue goes back to page one,
 * the customer list drops the band over its rows. Neither is this file's
 * business, and neither would survive being guessed at from in here.
 */
export function useSavedViews<TFilters>(
  scope: SavedViewScope<TFilters>,
  /** The filters on screen right now, which is what "modified" is measured against. */
  filters: TFilters,
  onApply: (filters: TFilters) => void,
): SavedViewsPanel {
  // Read once, lazily: storage is synchronous and only changes through here.
  const [views, setViews] = useState<SavedView<TFilters>[]>(() => readSavedViews(scope))
  const [activeViewId, setActiveViewId] = useState<string | null>(null)

  function commit(next: SavedView<TFilters>[]) {
    setViews(next)
    writeSavedViews(scope, next)
  }

  // Derived rather than held: a view deleted in this same render simply stops
  // being found, and the filters are compared against what is on screen now.
  const activeView = views.find((view) => view.id === activeViewId) ?? null

  return {
    allLabel: scope.allLabel,
    filtersDescription: scope.filtersDescription,
    views,
    activeViewId,
    // With nothing selected the comparison is against the screen's defaults, so
    // "All tickets" is marked modified once the filters are narrowed at all.
    isModified: !sameFilters(scope, filters, activeView?.filters ?? scope.defaultFilters),

    onSelectView(id) {
      const view = id === null ? null : (views.find((candidate) => candidate.id === id) ?? null)

      onApply(view ? view.filters : scope.defaultFilters)
      setActiveViewId(view?.id ?? null)
    },

    onSaveView(name) {
      const view = createSavedView(scope, name, filters)

      commit([...views, view])
      setActiveViewId(view.id)
    },

    onRenameView(id, name) {
      commit(views.map((view) => (view.id === id ? { ...view, name: name.trim() } : view)))
    },

    onDeleteView(id) {
      commit(views.filter((view) => view.id !== id))

      // The filters on screen are the person's current work; deleting the view
      // they came from drops the label, not the filtering.
      if (id === activeViewId) {
        setActiveViewId(null)
      }
    },
  }
}
