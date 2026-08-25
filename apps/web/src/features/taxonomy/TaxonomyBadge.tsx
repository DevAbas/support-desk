import { Badge } from '@/design-system'
import { findTaxonomyEntry, type TaxonomyEntry } from '@harness-sample/shared'
import { badgeStatusByAppearance } from './appearance'

interface TaxonomyBadgeProps {
  entries: readonly TaxonomyEntry[]
  value: string
}

/**
 * A status or a priority as a badge, using the label and appearance an admin
 * chose for it.
 *
 * A value with no entry — the taxonomy has not arrived yet, or the ticket in the
 * cache still holds a value that was removed a moment ago — is shown raw and
 * neutral rather than blank.
 */
export function TaxonomyBadge({ entries, value }: TaxonomyBadgeProps) {
  const entry = findTaxonomyEntry(entries, value)

  return (
    <Badge status={entry ? badgeStatusByAppearance[entry.appearance] : 'neutral'}>
      {entry?.label ?? value}
    </Badge>
  )
}
