import { useState } from 'react'
import { Button, Select } from '@harness-sample/ui'
import type { CustomerPlan } from '@harness-sample/shared'
import { planOptions } from '../customerFilters'

interface CustomersBulkActionsBarProps {
  selectedCount: number
  /** Rows loaded so far, which is what "select all" can reach. */
  loadedCount: number
  onSelectAll: () => void
  onClearSelection: () => void
  onApplyPlan: (plan: CustomerPlan) => void
  onDelete: () => void
  isBusy?: boolean
}

/**
 * What can be done to a selection, on a strip above the list.
 *
 * Admin-only. The caller decides whether to render it; see `CustomersPage`.
 *
 * It carries the select-all, which is the difference between this bar and the
 * ticket one. A table puts select-all in a header cell, because a table has a
 * header and a page it applies to. A list has neither: it has no header row to
 * put a control in, and "all" grows every time load-more is pressed. So the
 * control says how many it will tick, it lives beside the count it changes, and
 * it goes away once everything loaded is already ticked.
 *
 * The plan starts unchosen rather than on a default. A default here is one click
 * away from moving forty accounts onto Free, and no plan is the obvious one to
 * land on — where the ticket bar can open on `resolved` because that is what
 * bulk-editing a queue is nearly always for.
 */
export function CustomersBulkActionsBar({
  selectedCount,
  loadedCount,
  onSelectAll,
  onClearSelection,
  onApplyPlan,
  onDelete,
  isBusy = false,
}: CustomersBulkActionsBarProps) {
  const [plan, setPlan] = useState<CustomerPlan | ''>('')

  return (
    <div
      aria-label="Bulk actions"
      role="group"
      className="flex flex-wrap items-end justify-between gap-4 border-b border-border bg-primary-subtle px-4 py-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-body font-medium text-primary-subtle-fg">
          {selectedCount} {selectedCount === 1 ? 'customer' : 'customers'} selected
        </p>

        {selectedCount < loadedCount ? (
          <Button variant="ghost" size="sm" onClick={onSelectAll} disabled={isBusy}>
            {`Select all ${String(loadedCount)}`}
          </Button>
        ) : null}

        <Button variant="ghost" size="sm" onClick={onClearSelection} disabled={isBusy}>
          Clear selection
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <Select
          label="Set plan to"
          options={planOptions}
          placeholder="Choose a plan"
          value={plan}
          onChange={(event) => setPlan(event.target.value as CustomerPlan | '')}
          className="w-40"
          disabled={isBusy}
        />
        <Button
          size="md"
          onClick={() => {
            if (plan !== '') {
              onApplyPlan(plan)
            }
          }}
          // Nothing to apply until a plan is named, which is also what stops the
          // placeholder from being submittable as a value.
          disabled={isBusy || plan === ''}
        >
          Apply
        </Button>
        <Button variant="danger" size="md" onClick={onDelete} disabled={isBusy}>
          Delete selected
        </Button>
      </div>
    </div>
  )
}
