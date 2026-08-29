import { Badge, type BadgeStatus } from '@harness-sample/ui'
import { TICKET_STATUS_LABELS, type TicketStatus } from '@harness-sample/shared'

/**
 * The domain-to-presentation mapping. `Badge` knows about appearances; this file
 * knows what a ticket status is. Keeping the two apart is why `Badge` never has
 * to grow a `status="pending"` case.
 */
const badgeStatusByTicketStatus: Record<TicketStatus, BadgeStatus> = {
  open: 'info',
  pending: 'warning',
  resolved: 'success',
  closed: 'neutral',
}

interface TicketStatusBadgeProps {
  status: TicketStatus
}

export function TicketStatusBadge({ status }: TicketStatusBadgeProps) {
  return <Badge status={badgeStatusByTicketStatus[status]}>{TICKET_STATUS_LABELS[status]}</Badge>
}
