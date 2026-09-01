import { Badge, type BadgeStatus } from '@support-desk/ui'
import { CUSTOMER_PLAN_LABELS, type CustomerPlan } from '@support-desk/shared'

/**
 * The domain-to-presentation mapping, the same shape as `TicketStatusBadge`.
 *
 * Four plans, four appearances, so the size of an account reads at a glance down
 * a dense list. `warning` here is not a warning: it is the loudest tone the
 * scale has short of destructive, and Enterprise is the loudest plan. Deciding
 * that is exactly what the feature layer is for, and exactly why `Badge` does
 * not know what a plan is.
 */
const badgeStatusByPlan: Record<CustomerPlan, BadgeStatus> = {
  free: 'neutral',
  starter: 'info',
  pro: 'success',
  enterprise: 'warning',
}

interface CustomerPlanBadgeProps {
  plan: CustomerPlan
}

export function CustomerPlanBadge({ plan }: CustomerPlanBadgeProps) {
  return <Badge status={badgeStatusByPlan[plan]}>{CUSTOMER_PLAN_LABELS[plan]}</Badge>
}
