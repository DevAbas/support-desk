import type { TicketPriority } from '@harness-sample/shared'
import { TaxonomyBadge } from '@/features/taxonomy/TaxonomyBadge'
import { useTaxonomySets } from '@/features/taxonomy/useTaxonomy'

interface TicketPriorityBadgeProps {
  priority: TicketPriority
}

export function TicketPriorityBadge({ priority }: TicketPriorityBadgeProps) {
  const { priorities } = useTaxonomySets()

  return <TaxonomyBadge entries={priorities} value={priority} />
}
