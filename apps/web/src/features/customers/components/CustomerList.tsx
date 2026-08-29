import { Avatar, List, ListRow } from '@harness-sample/ui'
import { formatDate } from '@/lib/format'
import type { CustomerSummary } from '@harness-sample/shared'
import { CustomerPlanBadge } from './CustomerPlanBadge'

interface CustomerListProps {
  customers: readonly CustomerSummary[]
  isLoading: boolean
  /** The one whose drawer is open, or null. */
  openCustomerId: string | null
  onOpen: (id: string) => void
}

function ticketLabel(count: number): string {
  return count === 1 ? '1 ticket' : `${String(count)} tickets`
}

export function CustomerList({
  customers,
  isLoading,
  openCustomerId,
  onOpen,
}: CustomerListProps) {
  return (
    <List
      label="Customers"
      isLoading={isLoading}
      isEmpty={customers.length === 0}
      loadingMessage="Loading customers…"
      emptyMessage="No customers match these filters."
    >
      {customers.map((customer) => (
        <ListRow
          key={customer.id}
          // Decorative: the name is written immediately beside it, and hearing
          // it twice is worse than not seeing the picture at all.
          leading={<Avatar name={customer.name} src={customer.avatarUrl} decorative />}
          title={customer.name}
          subtitle={`${customer.company} · ${customer.email}`}
          meta={
            <span className="flex flex-col items-end gap-0.5">
              <span>{ticketLabel(customer.ticketCount)}</span>
              <span>Since {formatDate(customer.signupDate)}</span>
            </span>
          }
          trailing={<CustomerPlanBadge plan={customer.plan} />}
          onSelect={() => onOpen(customer.id)}
          isSelected={customer.id === openCustomerId}
        />
      ))}
    </List>
  )
}
