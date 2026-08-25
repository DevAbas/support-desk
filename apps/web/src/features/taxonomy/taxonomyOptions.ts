import type { SelectOption } from '@/design-system'
import { findTaxonomyEntry, type TaxonomyEntry } from '@harness-sample/shared'

/** One option per entry, in taxonomy order — which is the order an admin arranged. */
export function toValueOptions(entries: readonly TaxonomyEntry[]): SelectOption[] {
  return entries.map((entry) => ({ value: entry.value, label: entry.label }))
}

/** The same list with "do not filter on this" in front of it. */
export function toFilterOptions(
  entries: readonly TaxonomyEntry[],
  allLabel: string,
): SelectOption[] {
  return [{ value: 'all', label: allLabel }, ...toValueOptions(entries)]
}

/**
 * Keeps a dropdown honest about a value the taxonomy no longer has.
 *
 * A saved view can outlive the status it was built on, and a `<select>` whose
 * value matches none of its options quietly displays the first one instead —
 * which reads as though the filter had changed by itself. Naming the missing
 * value as removed says what actually happened.
 */
export function withUnknownValue(
  options: readonly SelectOption[],
  value: string,
  entries: readonly TaxonomyEntry[],
): SelectOption[] {
  if (value === '' || findTaxonomyEntry(entries, value) || value === 'all') {
    return [...options]
  }

  return [...options, { value, label: `${value} (removed)` }]
}
