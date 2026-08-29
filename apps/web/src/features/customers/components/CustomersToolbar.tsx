import { Input, MultiSelect } from '@harness-sample/ui'
import type { CustomerPlan } from '@harness-sample/shared'
import { planOptions, type CustomerFilters } from '../customerFilters'

interface CustomersToolbarProps {
  filters: CustomerFilters
  onChange: (patch: Partial<CustomerFilters>) => void
  /** How many the filters match, and how many have been loaded so far. */
  total: number
  loaded: number
  isLoading: boolean
}

/**
 * The filters, on one line above the list rather than in a card of their own.
 *
 * A dense list is scanned, and the fewer rows the controls push off the screen
 * the better — which is a different trade from the ticket screen, where the
 * filters are a panel because a table is read one page at a time anyway.
 */
export function CustomersToolbar({
  filters,
  onChange,
  total,
  loaded,
  isLoading,
}: CustomersToolbarProps) {
  return (
    <div className="flex flex-wrap items-end gap-4 border-b border-border px-4 py-3">
      <Input
        label="Search"
        type="search"
        value={filters.search}
        placeholder="Name, company or email"
        className="w-64"
        onChange={(event) => onChange({ search: event.target.value })}
      />

      <MultiSelect
        label="Plan"
        options={planOptions}
        value={filters.plans}
        placeholder="All plans"
        className="w-52"
        onChange={(plans: CustomerPlan[]) => onChange({ plans })}
      />

      {/* Announced politely, because pressing load-more adds twenty rows below
          the fold and otherwise says nothing. Absent rather than saying so while
          the first page loads: the list already announces that, and two live
          regions reporting the same wait is one of them too many. */}
      {isLoading ? null : (
        <p role="status" aria-live="polite" className="ml-auto text-sm text-fg-muted">
          {`Showing ${String(loaded)} of ${String(total)}`}
        </p>
      )}
    </div>
  )
}
