import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, CardHeader, Input, Modal, Select } from '../../design-system'
import { bulkDeleteTickets, bulkUpdateStatus } from '../../lib/api'
import { type TicketStatus } from '../../lib/types'
import { useRole } from '../roles/useRole'
import { BulkActionsBar } from './components/BulkActionsBar'
import { Pagination } from './components/Pagination'
import { SavedViewsSidebar } from './components/SavedViewsSidebar'
import { TicketsTable } from './components/TicketsTable'
import { useSavedViews } from './hooks/useSavedViews'
import { useTickets } from './hooks/useTickets'
import type { SavedView } from './savedViews'
import {
  areFiltersEqual,
  DEFAULT_FILTERS,
  priorityFilterOptions,
  statusFilterOptions,
  type PriorityFilter,
  type StatusFilter,
  type TicketFilters,
} from './ticketFilters'

const PAGE_SIZE = 10

export function TicketListPage() {
  const { canManageTickets } = useRole()
  const navigate = useNavigate()

  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<TicketFilters>(DEFAULT_FILTERS)
  const [activeViewId, setActiveViewId] = useState<string | null>(null)
  const [selection, setSelection] = useState<string[]>([])
  const [isBulkBusy, setIsBulkBusy] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

  const savedViews = useSavedViews()

  const { result, isLoading, error, reload } = useTickets({
    page,
    pageSize: PAGE_SIZE,
    ...filters,
  })

  const tickets = result?.rows ?? []

  // Derived rather than stored, so the selection cannot go stale: rows that are
  // no longer on screen, and any selection at all once admin is lost, drop out
  // without an effect having to reset them.
  const selectedIds = canManageTickets
    ? selection.filter((id) => tickets.some((ticket) => ticket.id === id))
    : []

  // Also derived: a view deleted elsewhere in this render simply stops being
  // found, and the filters are compared against what is on screen right now.
  const activeView = savedViews.views.find((view) => view.id === activeViewId) ?? null
  const isViewModified = !areFiltersEqual(filters, activeView?.filters ?? DEFAULT_FILTERS)

  function changeFilters(patch: Partial<TicketFilters>) {
    setFilters((current) => ({ ...current, ...patch }))
    setPage(1)
  }

  function selectView(view: SavedView | null) {
    setFilters(view ? { ...view.filters } : DEFAULT_FILTERS)
    setActiveViewId(view?.id ?? null)
    setPage(1)
  }

  function saveView(name: string) {
    setActiveViewId(savedViews.saveView(name, filters).id)
  }

  function deleteView(id: string) {
    savedViews.deleteView(id)

    // The filters on screen are the person's current work; deleting the view
    // they came from drops the label, not the filtering.
    if (id === activeViewId) {
      setActiveViewId(null)
    }
  }

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

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <SavedViewsSidebar
          views={savedViews.views}
          activeViewId={activeViewId}
          isModified={isViewModified}
          onSelectView={selectView}
          onSaveView={saveView}
          onRenameView={savedViews.renameView}
          onDeleteView={deleteView}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <Card>
            <CardHeader
              title="Filters"
              description="Narrow the queue down before working through it."
            />

            <div className="grid gap-4 px-5 py-4 sm:grid-cols-3">
              <Select
                label="Status"
                options={statusFilterOptions}
                value={filters.status}
                onChange={(event) =>
                  changeFilters({ status: event.target.value as StatusFilter })
                }
              />
              <Select
                label="Priority"
                options={priorityFilterOptions}
                value={filters.priority}
                onChange={(event) =>
                  changeFilters({ priority: event.target.value as PriorityFilter })
                }
              />
              <Input
                label="Search"
                type="search"
                value={filters.search}
                placeholder="Title or ticket ID"
                onChange={(event) => changeFilters({ search: event.target.value })}
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
        </div>
      </div>

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
