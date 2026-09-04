import { beforeEach, describe, expect, it } from 'vitest'
import {
  createSavedView,
  readSavedViews,
  writeSavedViews,
} from '@/features/savedViews/savedViewStorage'
import { sameFilters } from '@/features/savedViews/sameFilters'
import type { SavedViewScope } from '@/features/savedViews/savedViews.types'

/**
 * The mechanism, against a scope no screen owns.
 *
 * A made-up scope rather than the ticket or customer one on purpose: what is
 * tested here is what every screen gets for free, and a test written against a
 * real screen's filters cannot tell the two apart. The two scopes themselves are
 * tested through their screens, which is where a filter is actually chosen.
 *
 * `TestFilters` carries the three shapes a stored filter can be made of — a set,
 * a string, and a field the screen grew later — because the comparison is
 * structural and those are what it has to get right.
 */
interface TestFilters {
  tags: string[]
  search: string
  /** Added after the fact, the way a screen grows a filter. */
  onlyMine?: boolean
}

function makeScope(storageKey: string): SavedViewScope<TestFilters> {
  return {
    storageKey,
    allLabel: 'Everything',
    filtersDescription: 'The tags and search on screen are stored under this name.',
    defaultFilters: { tags: [], search: '' },
    // Spread, the way `TICKET_SAVED_VIEWS` does it: a canonical form says what
    // it changes and passes on what it does not, so an optional filter is
    // present here exactly when the screen had it.
    normaliseFilters: (filters) => ({
      ...filters,
      tags: [...filters.tags].sort(),
      search: filters.search.trim(),
    }),
    parseFilters: (value) => {
      if (typeof value !== 'object' || value === null) {
        return null
      }

      const candidate = value as Record<string, unknown>
      const { tags, search } = candidate

      if (typeof search !== 'string' || !Array.isArray(tags)) {
        return null
      }

      const entries: unknown[] = tags

      if (!entries.every((tag) => typeof tag === 'string')) {
        return null
      }

      return { tags: entries, search }
    },
  }
}

const scope = makeScope('test.saved-views')

beforeEach(() => {
  window.localStorage.clear()
})

describe('saved view storage', () => {
  it('has no views until something is written', () => {
    expect(readSavedViews(scope)).toEqual([])
  })

  it('round-trips the views it is given', () => {
    const view = createSavedView(scope, 'Mine', { tags: ['b', 'a'], search: 'x' })

    writeSavedViews(scope, [view])

    expect(readSavedViews(scope)).toEqual([view])
  })

  it('stores the name trimmed and the filters in canonical form', () => {
    const view = createSavedView(scope, '  Mine  ', { tags: ['b', 'a'], search: '  x  ' })

    // Otherwise a view is modified the instant it is saved, because what is on
    // screen and what was stored differ by the space nobody meant to type.
    expect(view.name).toBe('Mine')
    expect(view.filters).toEqual({ tags: ['a', 'b'], search: 'x' })
  })

  it('survives storage that cannot be parsed', () => {
    window.localStorage.setItem(scope.storageKey, '{ not json')

    expect(readSavedViews(scope)).toEqual([])
  })

  it('survives storage holding something that is not a list of views', () => {
    window.localStorage.setItem(scope.storageKey, JSON.stringify({ views: [] }))

    expect(readSavedViews(scope)).toEqual([])
  })

  it('drops entries that are not views, keeping the ones that are', () => {
    window.localStorage.setItem(
      scope.storageKey,
      JSON.stringify([
        { id: 'a', name: 'Fine', filters: { tags: [], search: '' } },
        'not a view',
        { id: 'b', filters: { tags: [], search: '' } },
        { id: 'c', name: 'No filters' },
      ]),
    )

    expect(readSavedViews(scope).map((view) => view.name)).toEqual(['Fine'])
  })

  it('drops entries whose filters the scope refuses', () => {
    window.localStorage.setItem(
      scope.storageKey,
      JSON.stringify([
        { id: 'a', name: 'Fine', filters: { tags: ['x'], search: '' } },
        { id: 'b', name: 'Stale', filters: { tags: [7], search: '' } },
      ]),
    )

    expect(readSavedViews(scope).map((view) => view.name)).toEqual(['Fine'])
  })

  it('keeps one screen’s views out of another’s', () => {
    // The reason there is a key per scope rather than one document holding
    // every screen's: a third screen coordinates with nothing to get its own.
    const other = makeScope('test.saved-views.other')

    writeSavedViews(scope, [createSavedView(scope, 'Mine', { tags: [], search: '' })])

    expect(readSavedViews(other)).toEqual([])
    expect(readSavedViews(scope)).toHaveLength(1)
  })
})

describe('sameFilters', () => {
  it('is true of a combination and itself', () => {
    const filters: TestFilters = { tags: ['a'], search: 'x' }

    expect(sameFilters(scope, filters, { tags: ['a'], search: 'x' })).toBe(true)
  })

  it('ignores the differences the scope normalises away', () => {
    // Whitespace the server trims, and a set ticked in the other order. Neither
    // is a different question, so neither may mark a view modified.
    expect(sameFilters(scope, { tags: [], search: 'x' }, { tags: [], search: 'x  ' })).toBe(true)
    expect(sameFilters(scope, { tags: ['a', 'b'], search: '' }, { tags: ['b', 'a'], search: '' }))
      .toBe(true)
  })

  it('sees a difference in a value', () => {
    expect(sameFilters(scope, { tags: [], search: 'x' }, { tags: [], search: 'y' })).toBe(false)
  })

  it('sees a set that has gained or lost a member', () => {
    expect(sameFilters(scope, { tags: ['a'], search: '' }, { tags: ['a', 'b'], search: '' })).toBe(
      false,
    )
    expect(sameFilters(scope, { tags: ['a'], search: '' }, { tags: ['b'], search: '' })).toBe(false)
  })

  /**
   * The hole a per-screen comparison leaves. Written by hand it names every
   * field it compares — `areFiltersEqual` named all three of the queue's — so a
   * filter the screen grows later is silently not compared, and the view stays
   * unmodified while the list underneath it changes. Comparing the whole
   * normalised value has no field to forget.
   */
  it('sees a filter the screen has grown since the view was saved', () => {
    expect(
      sameFilters(scope, { tags: [], search: '' }, { tags: [], search: '', onlyMine: true }),
    ).toBe(false)
  })

  /**
   * Both halves at once, which is the only place this shows.
   *
   * `JSON.stringify` drops a key whose value is `undefined`, so an optional
   * filter nobody set goes into storage as an absent key and comes back as one,
   * while the screen goes on holding the key with nothing in it. Counted as a
   * difference, that marks the view modified the instant it is saved and on
   * every reload after, with nothing the person can do to clear it — the failure
   * `createSavedView` stores canonically to prevent.
   */
  it('does not call a view modified over an optional filter nobody set', () => {
    const onScreen: TestFilters = { tags: ['a'], search: 'x', onlyMine: undefined }

    writeSavedViews(scope, [createSavedView(scope, 'Mine', onScreen)])

    const stored = readSavedViews(scope)

    expect(stored).toHaveLength(1)
    expect(sameFilters(scope, onScreen, stored[0].filters)).toBe(true)
  })
})
