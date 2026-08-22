import { Badge, type BadgeStatus } from '../../../design-system'
import { TICKET_PRIORITY_LABELS, type TicketPriority } from '../../../lib/types'

const badgeStatusByPriority: Record<TicketPriority, BadgeStatus> = {
  low: 'neutral',
  medium: 'info',
  high: 'danger',
}

interface TicketPriorityBadgeProps {
  priority: TicketPriority
}

export function TicketPriorityBadge({ priority }: TicketPriorityBadgeProps) {
  return <Badge status={badgeStatusByPriority[priority]}>{TICKET_PRIORITY_LABELS[priority]}</Badge>
}
