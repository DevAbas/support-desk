import { Badge, type BadgeStatus } from '@support-desk/ui'
import { TICKET_STATUS_LABELS, type TicketStatus } from '@support-desk/shared'

/**
 * The domain-to-presentation mapping. `Badge` knows about appearances; this file
 * knows what a ticket status is. Keeping the two apart is why `Badge` never has
 * to grow a `status="pending"` case.
 *
 * Keyed by `TicketStatus`, so a fifth status does not compile until somebody has
 * decided what it looks like. That is one of the two edits a new status needs on
 * this side — the label in `TICKET_STATUS_LABELS` is the other — and both are
 * deliberately compile errors: a lookup with a neutral fallback would draw the
 * new status grey and unnamed everywhere at once and never say so.
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
