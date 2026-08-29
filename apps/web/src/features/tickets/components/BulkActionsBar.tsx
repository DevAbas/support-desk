import { useState } from 'react'
import { Button, Select } from '@harness-sample/ui'
import { TICKET_STATUSES, TICKET_STATUS_LABELS, type TicketStatus } from '@harness-sample/shared'

const statusOptions = TICKET_STATUSES.map((status) => ({
  value: status,
  label: TICKET_STATUS_LABELS[status],
}))

interface BulkActionsBarProps {
  selectedCount: number
  onApplyStatus: (status: TicketStatus) => void
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
  const [status, setStatus] = useState<TicketStatus>('resolved')

  return (
    <div
      aria-label="Bulk actions"
      role="group"
      className="flex flex-wrap items-end justify-between gap-4 border-b border-border bg-primary-subtle px-4 py-3"
    >
      <p className="text-sm font-medium text-primary-subtle-fg">
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
        <Button size="md" onClick={() => onApplyStatus(status)} disabled={isBusy}>
          Apply
        </Button>
        <Button variant="danger" size="md" onClick={onDelete} disabled={isBusy}>
          Delete selected
        </Button>
      </div>
    </div>
  )
}
