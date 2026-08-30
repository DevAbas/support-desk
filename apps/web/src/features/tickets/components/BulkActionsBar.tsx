import { useState } from 'react'
import { Button, Select } from '@harness-sample/ui'
import { TICKET_STATUSES, TICKET_STATUS_LABELS, type TicketStatus } from '@harness-sample/shared'

const statusOptions = TICKET_STATUSES.map((status) => ({
  value: status,
  label: TICKET_STATUS_LABELS[status],
}))

/**
 * The status a bulk edit opens on, and goes back to once one has landed.
 *
 * A default is safe here where `CustomersBulkActionsBar` deliberately has none.
 * That bar opens on a placeholder because a default there is one click from
 * moving accounts onto Free — a billing change nobody asked for, and no plan is
 * the obvious one to land on. A status is none of those things: it is reversible
 * from the same bar, and working a queue in bulk is nearly always working it
 * down to resolved. The reasoning still holds, so the default stays.
 */
const DEFAULT_STATUS: TicketStatus = 'resolved'

interface BulkActionsBarProps {
  selectedCount: number
  /**
   * Handed the status to apply and a callback to run once it has landed, which
   * is when the select goes back to `DEFAULT_STATUS`. A status left on screen
   * after the rows have moved reads as a change still waiting to be applied.
   */
  onApplyStatus: (status: TicketStatus, onApplied: () => void) => void
  onDelete: () => void
  isBusy?: boolean
}

/** Admin-only. The caller decides whether to render it; see TicketListPage. */
export function BulkActionsBar({
  selectedCount,
  onApplyStatus,
  onDelete,
  isBusy = false,
}: BulkActionsBarProps) {
  const [status, setStatus] = useState<TicketStatus>(DEFAULT_STATUS)

  return (
    <div
      aria-label="Bulk actions"
      role="group"
      className="flex flex-wrap items-end justify-between gap-4 border-b border-border bg-primary-subtle px-3 py-2"
    >
      <p className="text-body font-medium text-primary-subtle-fg">
        {selectedCount} {selectedCount === 1 ? 'ticket' : 'tickets'} selected
      </p>

      <div className="flex flex-wrap items-end gap-2">
        <Select
          label="Set status to"
          options={statusOptions}
          value={status}
          onChange={(event) => setStatus(event.target.value as TicketStatus)}
          className="w-40"
          disabled={isBusy}
        />
        <Button
          size="md"
          onClick={() => onApplyStatus(status, () => setStatus(DEFAULT_STATUS))}
          disabled={isBusy}
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
