import { Avatar, List, ListRow } from '@support-desk/ui'
import { formatDate } from '@/lib/format'
import type { CustomerSummary } from '@support-desk/shared'
import { CustomerPlanBadge } from './CustomerPlanBadge'

interface CustomerListProps {
  customers: readonly CustomerSummary[]
  isLoading: boolean
  /** The one whose drawer is open, or null. */
  openCustomerId: string | null
  onOpen: (id: string) => void
  /** Bulk actions are admin-only, so the checkboxes are too. */
  isSelectable: boolean
  selectedIds: readonly string[]
  onToggleSelected: (id: string, isSelected: boolean) => void
}

export function CustomerList({
  customers,
  isLoading,
  openCustomerId,
  onOpen,
  isSelectable,
  selectedIds,
  onToggleSelected,
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
        <CustomerRow
          key={customer.id}
          customer={customer}
          isOpen={customer.id === openCustomerId}
          onOpen={onOpen}
          isSelectable={isSelectable}
          isSelected={selectedIds.includes(customer.id)}
          onToggleSelected={onToggleSelected}
        />
      ))}
    </List>
  )
}

interface CustomerRowProps {
  customer: CustomerSummary
  /** Whether this is the customer the drawer is showing. */
  isOpen: boolean
  onOpen: (id: string) => void
  isSelectable: boolean
  isSelected: boolean
  onToggleSelected: (id: string, isSelected: boolean) => void
}

function ticketLabel(count: number): string {
  return count === 1 ? '1 ticket' : `${String(count)} tickets`
}

/**
 * One person, as a row.
 *
 * Named rather than written inline in the `.map()` above, which is where it was
 * heading: a row that carries a checkbox, an avatar, two lines, two figures and
 * a badge is a component, and the list reads as a list once it is one.
 *
 * The two states a row can be in are independent and are drawn differently on
 * purpose. Ticked is a checkbox, and says this row is part of the next bulk
 * action. Open is `isSelected` on the row itself, and says this is the customer
 * the drawer is showing.
 */
function CustomerRow({
  customer,
  isOpen,
  onOpen,
  isSelectable,
  isSelected,
  onToggleSelected,
}: CustomerRowProps) {
  return (
    <ListRow
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
      isSelected={isOpen}
      selection={
        isSelectable
          ? {
              // Named by the person, not by "row 4": sixty checkboxes all
              // called "Select" are sixty controls nobody can tell apart.
              label: `Select ${customer.name}`,
              isChecked: isSelected,
              onChange: (isChecked) => onToggleSelected(customer.id, isChecked),
            }
          : undefined
      }
    />
  )
}
