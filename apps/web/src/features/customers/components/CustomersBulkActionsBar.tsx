import { useState } from 'react'
import { Alert, Button, Checkbox, Select, Toolbar } from '@support-desk/ui'
import type { CustomerPlan } from '@support-desk/shared'
import { planOptions } from '../customerFilters'

interface CustomersBulkActionsBarProps {
  selectedCount: number
  /** Rows loaded so far, which is what "select all" can reach. */
  loadedCount: number
  /**
   * The most ids one bulk request may carry — `MAX_CUSTOMER_BULK_IDS`. Handed in
   * rather than imported so that the number the select-all promises and the
   * number the page ticks are the one value.
   */
  maxBulkIds: number
  onSelectAll: () => void
  /**
   * Unticks the rows on screen, which is not the same as clearing the
   * selection: a selection here can hold rows the filters are hiding, and the
   * inverse of "tick what is loaded" leaves those alone. `onClearSelection` is
   * the one that means all of it.
   */
  onDeselectAll: () => void
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
 * control says how many it will tick and lives beside the count it changes.
 *
 * It is a checkbox rather than a button, and it stays mounted once everything is
 * ticked, which is the one behavioural property the header cell had that moving
 * the control here first lost. A button that disappears on activation takes the
 * keyboard with it: focus falls to `<body>` and the next Tab starts again from
 * the top of the document. A checkbox has somewhere to go instead — it flips,
 * and unticking it is the way back, the same as the ticket header. Unticking it
 * with nothing filtered empties the selection and so takes this bar with it,
 * which is what `Clear selection` beside it has always done: a bar that exists
 * because there is a selection goes when there is not one.
 *
 * A selection here can also outgrow what one request may carry, which a ticket
 * selection cannot: it is bounded by its page. So the select-all never promises
 * more than `maxBulkIds`, and an action is refused above it rather than sent and
 * rejected — the contract parses this body on the way out, and a schema failure
 * reaching a person is a stack of JSON where a sentence should be.
 *
 * The plan starts unchosen rather than on a default. A default here is one click
 * away from moving forty accounts onto Free, and no plan is the obvious one to
 * land on — where the ticket bar can open on `resolved` because that is what
 * bulk-editing a queue is nearly always for.
 *
 * Apply is `secondary`, not the `primary` it defaults to. Two emphases in one
 * strip is one too many, and of the two the destructive one should be the only
 * thing shouting: a `primary` beside a `danger` reads as a pair to choose
 * between rather than as an action and the dangerous one.
 */
export function CustomersBulkActionsBar({
  selectedCount,
  loadedCount,
  maxBulkIds,
  onSelectAll,
  onDeselectAll,
  onClearSelection,
  onApplyPlan,
  onDelete,
  isBusy = false,
}: CustomersBulkActionsBarProps) {
  const [plan, setPlan] = useState<CustomerPlan | ''>('')

  // What ticking everything would actually tick, which is not always what is
  // loaded: a control that says 600 and ticks 500 is a control that lies once
  // and then appears to do nothing when it is pressed again.
  const selectableCount = Math.min(loadedCount, maxBulkIds)
  const isOverBulkLimit = selectedCount > maxBulkIds

  return (
    <Toolbar
      aria-label="Bulk actions"
      role="group"
      className="items-end justify-between bg-primary-subtle"
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-body font-medium text-primary-subtle-fg">
          {selectedCount} {selectedCount === 1 ? 'customer' : 'customers'} selected
        </p>

        <Checkbox
          label={`Select all ${String(selectableCount)}`}
          checked={selectedCount >= selectableCount}
          // Some of these, not all: the third state, which is what this control
          // is in for every selection that got the bar onto the screen.
          indeterminate={selectedCount < selectableCount}
          onChange={(event) => {
            if (event.target.checked) {
              onSelectAll()
            } else {
              onDeselectAll()
            }
          }}
          disabled={isBusy}
        />

        <Button variant="ghost" size="sm" onClick={onClearSelection} disabled={isBusy}>
          Clear selection
        </Button>

        {isOverBulkLimit ? (
          <Alert tone="warning" variant="inline">
            {`One action takes at most ${String(maxBulkIds)} customers at a time.`}
          </Alert>
        ) : null}
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
          variant="secondary"
          size="md"
          onClick={() => {
            if (plan !== '') {
              onApplyPlan(plan)
            }
          }}
          // Nothing to apply until a plan is named, which is also what stops the
          // placeholder from being submittable as a value.
          disabled={isBusy || plan === '' || isOverBulkLimit}
        >
          Apply
        </Button>
        <Button variant="danger" size="md" onClick={onDelete} disabled={isBusy || isOverBulkLimit}>
          Delete selected
        </Button>
      </div>
    </Toolbar>
  )
}
