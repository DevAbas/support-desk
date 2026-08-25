import type { TicketStatus } from '@harness-sample/shared'
import { TaxonomyBadge } from '@/features/taxonomy/TaxonomyBadge'
import { useTaxonomySets } from '@/features/taxonomy/useTaxonomy'

/**
 * The domain-to-presentation mapping. `Badge` knows about appearances; the
 * taxonomy knows what a ticket status is called and how it should read. Keeping
 * the two apart is why `Badge` never has to grow a `status="pending"` case.
 *
 * The label and the appearance are both configuration now — see the Settings
 * page — so this reads them from the query cache rather than from a table
 * compiled into the bundle.
 */
interface TicketStatusBadgeProps {
  status: TicketStatus
}

export function TicketStatusBadge({ status }: TicketStatusBadgeProps) {
  const { statuses } = useTaxonomySets()

  return <TaxonomyBadge entries={statuses} value={status} />
}
