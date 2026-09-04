import type { SavedView, SavedViewScope } from './savedViews.types'

/**
 * The views a screen has stored, and how they get there.
 *
 * Every function here takes the scope rather than reading a module-level key,
 * which is what lets two screens keep separate collections through one
 * mechanism. Nothing in this file knows what a filter is: `parseFilters` and
 * `normaliseFilters` are the only things that touch one.
 */

/** Reads a screen's stored views, dropping anything that no longer parses. */
export function readSavedViews<TFilters>(scope: SavedViewScope<TFilters>): SavedView<TFilters>[] {
  try {
    const raw = window.localStorage.getItem(scope.storageKey)

    if (!raw) {
      return []
    }

    const parsed: unknown = JSON.parse(raw)

    if (!Array.isArray(parsed)) {
      return []
    }

    // `flatMap` rather than `filter`, so the entries that survive are typed by
    // having been built here rather than by a predicate asserting they were.
    return parsed.flatMap((entry: unknown) => {
      const view = toSavedView(scope, entry)

      return view ? [view] : []
    })
  } catch {
    // Unavailable or unparseable storage means no saved views, not a crash.
    return []
  }
}

export function writeSavedViews<TFilters>(
  scope: SavedViewScope<TFilters>,
  views: readonly SavedView<TFilters>[],
): void {
  try {
    window.localStorage.setItem(scope.storageKey, JSON.stringify(views))
  } catch {
    // Private-mode and quota failures lose the view, but not the session.
  }
}

export function createSavedView<TFilters>(
  scope: SavedViewScope<TFilters>,
  name: string,
  filters: TFilters,
): SavedView<TFilters> {
  return {
    id: createId(),
    name: name.trim(),
    // Stored canonical, so that reapplying the view puts a clean value in every
    // field and so that a view is never modified the moment it is saved.
    filters: scope.normaliseFilters(filters),
  }
}

function toSavedView<TFilters>(
  scope: SavedViewScope<TFilters>,
  value: unknown,
): SavedView<TFilters> | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  const candidate = value as Record<string, unknown>
  const filters = scope.parseFilters(candidate.filters)

  if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string' || filters === null) {
    return null
  }

  return { id: candidate.id, name: candidate.name, filters }
}

/** `crypto.randomUUID` needs a secure context, which a LAN dev server is not. */
function createId(): string {
  return `view-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
