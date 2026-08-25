import { useState } from 'react'
import { Button, Select } from '@/design-system'
import type { TaxonomyEntry, TicketStatus } from '@harness-sample/shared'
import { toValueOptions } from '@/features/taxonomy/taxonomyOptions'

interface BulkActionsBarProps {
  selectedCount: number
  /** The statuses on offer, in the order an admin arranged them. */
  statuses: readonly TaxonomyEntry[]
  onApplyStatus: (status: TicketStatus) => void
  onDelete: () => void
  isBusy?: boolean
}

/** Admin-only. The caller decides whether to render it; see TicketListPage. */
export function BulkActionsBar({
  selectedCount,
  statuses,
  onApplyStatus,
  onDelete,
  isBusy = false,
}: BulkActionsBarProps) {
  // Held as "nothing picked yet" rather than defaulting to a hard-coded status,
  // because which statuses exist is not known until the taxonomy has loaded.
  const [status, setStatus] = useState<TicketStatus | ''>('')
  const selected = status === '' ? (statuses[0]?.value ?? '') : status

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
          options={toValueOptions(statuses)}
          value={selected}
          onChange={(event) => setStatus(event.target.value)}
          className="w-40"
          disabled={isBusy || statuses.length === 0}
        />
        <Button
          size="md"
          onClick={() => onApplyStatus(selected)}
          disabled={isBusy || selected === ''}
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
