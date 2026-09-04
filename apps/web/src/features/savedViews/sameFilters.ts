import type { SavedViewScope } from './savedViews.types'

/**
 * Whether two filter combinations would produce the same list.
 *
 * Shared, and deliberately. Written per-screen, this is a function that names
 * every field it compares — and a field it does not name is one the screen can
 * grow without the comparison noticing, which shows up as a view that stays
 * unmodified while the list underneath it changes. Comparing the whole
 * normalised value has no such hole: a filter added to the screen is compared
 * the day it is added.
 *
 * What stays per-screen is which differences are not differences, and that is
 * `normaliseFilters` on the scope — which the screen already owes storage, so
 * sharing the comparison costs it nothing new to write.
 */
export function sameFilters<TFilters>(
  scope: SavedViewScope<TFilters>,
  a: TFilters,
  b: TFilters,
): boolean {
  return isSameValue(scope.normaliseFilters(a), scope.normaliseFilters(b))
}

/**
 * Structural equality over the values a filter combination can hold.
 *
 * A saved view is stored as JSON, so its filters are made of primitives, arrays
 * and plain objects and nothing else — which is what makes a comparison this
 * short complete rather than a general deep-equal with corners missing. It lives
 * here rather than in `lib/` for exactly that reason: the contract is "two
 * stored filter combinations", not "any two values".
 */
function isSameValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) {
    return true
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((item, index) => isSameValue(item, b[index]))
    )
  }

  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false
  }

  const left = a as Record<string, unknown>
  const right = b as Record<string, unknown>
  const leftKeys = Object.keys(left)

  // Both key sets are checked, so a field present on one side and absent on the
  // other is a difference whichever side it is on.
  return (
    leftKeys.length === Object.keys(right).length &&
    leftKeys.every((key) => key in right && isSameValue(left[key], right[key]))
  )
}
