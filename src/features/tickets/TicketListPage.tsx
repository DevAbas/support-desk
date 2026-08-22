import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, CardHeader, Input, Modal, Select } from '../../design-system'
import { bulkDeleteTickets, bulkUpdateStatus } from '../../lib/api'
import {
  TICKET_PRIORITIES,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUSES,
  TICKET_STATUS_LABELS,
  type TicketPriority,
  type TicketStatus,
} from '../../lib/types'
import { useRole } from '../roles/useRole'
import { BulkActionsBar } from './components/BulkActionsBar'
import { Pagination } from './components/Pagination'
import { TicketsTable } from './components/TicketsTable'
import { useTickets } from './hooks/useTickets'

const PAGE_SIZE = 10

type StatusFilter = TicketStatus | 'all'
type PriorityFilter = TicketPriority | 'all'

const statusFilterOptions = [
  { value: 'all', label: 'All statuses' },
  ...TICKET_STATUSES.map((status) => ({ value: status, label: TICKET_STATUS_LABELS[status] })),
]

const priorityFilterOptions = [
  { value: 'all', label: 'All priorities' },
  ...TICKET_PRIORITIES.map((priority) => ({
    value: priority,
    label: TICKET_PRIORITY_LABELS[priority],
  })),
]

export function TicketListPage() {
  const { canManageTickets } = useRole()
  const navigate = useNavigate()

  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<StatusFilter>('all')
  const [priority, setPriority] = useState<PriorityFilter>('all')
  const [search, setSearch] = useState('')
  const [selection, setSelection] = useState<string[]>([])
  const [isBulkBusy, setIsBulkBusy] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

  const { result, isLoading, error, reload } = useTickets({
    page,
    pageSize: PAGE_SIZE,
    status,
    priority,
    search,
  })

  const tickets = result?.rows ?? []

  // Derived rather than stored, so the selection cannot go stale: rows that are
  // no longer on screen, and any selection at all once admin is lost, drop out
  // without an effect having to reset them.
  const selectedIds = canManageTickets
    ? selection.filter((id) => tickets.some((ticket) => ticket.id === id))
    : []

  function toggleTicket(id: string) {
    setSelection((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    )
  }

  function toggleAll(selected: boolean) {
    setSelection(selected ? tickets.map((ticket) => ticket.id) : [])
  }

  async function applyBulkStatus(nextStatus: TicketStatus) {
    setIsBulkBusy(true)

    try {
      await bulkUpdateStatus(selectedIds, nextStatus)
      setSelection([])
      reload()
    } finally {
      setIsBulkBusy(false)
    }
  }

  async function confirmBulkDelete() {
    setIsBulkBusy(true)

    try {
      await bulkDeleteTickets(selectedIds)
      setSelection([])
      setIsConfirmingDelete(false)
      reload()
    } finally {
      setIsBulkBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-fg">Tickets</h1>
          <p className="text-sm text-fg-muted">Every support request in the queue.</p>
        </div>
        <Button onClick={() => navigate('/tickets/new')}>New ticket</Button>
      </div>

      <Card>
        <CardHeader
          title="Filters"
          description="Narrow the queue down before working through it."
        />

        <div className="grid gap-4 px-5 py-4 sm:grid-cols-3">
          <Select
            label="Status"
            options={statusFilterOptions}
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as StatusFilter)
              setPage(1)
            }}
          />
          <Select
            label="Priority"
            options={priorityFilterOptions}
            value={priority}
            onChange={(event) => {
              setPriority(event.target.value as PriorityFilter)
              setPage(1)
            }}
          />
          <Input
            label="Search"
            type="search"
            value={search}
            placeholder="Title or ticket ID"
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        {canManageTickets && selectedIds.length > 0 ? (
          <BulkActionsBar
            selectedCount={selectedIds.length}
            isBusy={isBulkBusy}
            onApplyStatus={applyBulkStatus}
            onDelete={() => setIsConfirmingDelete(true)}
          />
        ) : null}

        {error ? (
          <div className="flex items-center justify-between gap-4 border-b border-danger-border bg-danger-subtle px-4 py-3">
            <p className="text-sm text-danger-subtle-fg">{error}</p>
            <Button variant="secondary" size="sm" onClick={reload}>
              Try again
            </Button>
          </div>
        ) : null}

        <TicketsTable
          tickets={tickets}
          isLoading={isLoading}
          selectable={canManageTickets}
          selectedIds={selectedIds}
          onToggleTicket={toggleTicket}
          onToggleAll={toggleAll}
        />

        <Pagination
          page={result?.page ?? 1}
          pageCount={result?.pageCount ?? 1}
          total={result?.total ?? 0}
          pageSize={PAGE_SIZE}
          disabled={isLoading}
          onPageChange={setPage}
        />
      </Card>

      <Modal
        open={isConfirmingDelete}
        onClose={() => setIsConfirmingDelete(false)}
        title="Delete selected tickets"
        description={`This permanently removes ${selectedIds.length} ${
          selectedIds.length === 1 ? 'ticket' : 'tickets'
        }. This cannot be undone.`}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsConfirmingDelete(false)}
              disabled={isBulkBusy}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmBulkDelete} disabled={isBulkBusy}>
              {isBulkBusy ? 'Deleting…' : 'Delete tickets'}
            </Button>
          </>
        }
      />
    </div>
  )
}
