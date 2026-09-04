import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  Heading,
  Input,
  Select,
  Text,
} from '@support-desk/ui'
import { toErrorMessage } from '@/lib/api/http'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import type { TicketTransitionId } from '@support-desk/shared'
import { useRole } from '@/features/roles/useRole'
import { BulkActionsBar } from './components/BulkActionsBar'
import { BulkMoveReport } from './components/BulkMoveReport'
import { Pagination } from './components/Pagination'
import { SavedViewsSidebar } from './components/SavedViewsSidebar'
import { TicketsTable } from './components/TicketsTable'
import { TicketsToolbar } from './components/TicketsToolbar'
import { useBulkDeleteTickets } from './hooks/useBulkDeleteTickets'
import { useBulkMoveTickets } from './hooks/useBulkMoveTickets'
import { useSavedViews } from './hooks/useSavedViews'
import { useTickets } from './hooks/useTickets'
import { useTicketSelection } from './hooks/useTicketSelection'
import { useTicketsExport } from './hooks/useTicketsExport'
import type { SavedView } from './savedViews'
import {
  areFiltersEqual,
  DEFAULT_FILTERS,
  priorityFilterOptions,
  statusFilterOptions,
  toListTicketsQuery,
  type PriorityFilter,
  type StatusFilter,
  type TicketFilters,
} from './ticketFilters'

const PAGE_SIZE = 10

/** Long enough that typing a word is one request, short enough to feel live. */
const SEARCH_DEBOUNCE_MS = 250

export function TicketListPage() {
  const { canManageTickets } = useRole()
  const navigate = useNavigate()

  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<TicketFilters>(DEFAULT_FILTERS)
  const [activeViewId, setActiveViewId] = useState<string | null>(null)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

  const savedViews = useSavedViews()

  // The field stays instant. Only the request, and the cache key built from it,
  // wait for a pause in typing.
  const debouncedSearch = useDebouncedValue(filters.search, SEARCH_DEBOUNCE_MS)
  const query = toListTicketsQuery({ ...filters, search: debouncedSearch }, page, PAGE_SIZE)

  const tickets = useTickets(query)
  const bulkMove = useBulkMoveTickets()
  const bulkDelete = useBulkDeleteTickets()

  const rows = tickets.data?.rows ?? []
  const total = tickets.data?.total ?? 0
  const isBulkBusy = bulkMove.isPending || bulkDelete.isPending
  const loadError = tickets.isError ? toErrorMessage(tickets.error, 'Could not load tickets.') : null

  const csv = useTicketsExport(query, total)

  const selection = useTicketSelection(rows, canManageTickets)
  const { selectedIds } = selection

  // Derived: a view deleted elsewhere in this render simply stops being
  // found, and the filters are compared against what is on screen right now.
  const activeView = savedViews.views.find((view) => view.id === activeViewId) ?? null
  const isViewModified = !areFiltersEqual(filters, activeView?.filters ?? DEFAULT_FILTERS)

  /**
   * Drops the report over the table.
   *
   * `BulkMoveReport` draws mutation state, and a mutation holds its result until
   * something asks for it to be let go — so a report on one selection stays
   * pinned above rows it stopped describing several filters ago. The reset is on
   * the way *in* to whatever replaces those rows rather than on the way out of
   * the move, which is the line `CustomersPage` draws: a move's whole point is
   * the report it leaves behind, so there is no moment on the way out to drop it.
   *
   * Only once the mutation has settled — which is also exactly when there is a
   * report to drop. `reset()` on one still running takes the `onSuccess` waiting
   * to run with it, because the callbacks handed to `mutate` belong to the
   * observer's current mutation, and nothing on this screen is disabled while a
   * bulk move is in flight.
   *
   * Unmount needs nothing: mutation state belongs to the observer, so a screen
   * left and come back to comes back idle.
   */
  function forgetBulkMoveReport() {
    if (bulkMove.isSuccess || bulkMove.isError) {
      bulkMove.reset()
    }
  }

  /**
   * The one place the rows under the report change, which is what makes one
   * reset enough for three of the four ways it goes stale: a filter change and a
   * saved view both come back to the top, and paging is the third.
   */
  function changePage(next: number) {
    forgetBulkMoveReport()
    setPage(next)
  }

  function changeFilters(patch: Partial<TicketFilters>) {
    setFilters((current) => ({ ...current, ...patch }))
    changePage(1)
  }

  function selectView(view: SavedView | null) {
    setFilters(view ? { ...view.filters } : DEFAULT_FILTERS)
    setActiveViewId(view?.id ?? null)
    changePage(1)
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

  function applyBulkMove(move: TicketTransitionId, reason: string | undefined) {
    // Drops what the server says it moved, and nothing else. Two things are
    // deliberately kept ticked: anything selected while the request was in
    // flight, which was not part of what was done — `CustomersPage` draws the
    // same line — and the tickets the move was refused for, which are the ones
    // still needing something doing and so the ones to act on next.
    bulkMove.mutate(
      { ids: selectedIds, move, reason },
      { onSuccess: (result) => selection.drop(result.moved) },
    )
  }

  function confirmBulkDelete() {
    // The fourth way. A move's report would otherwise sit above a delete that
    // worked, still counting tickets, some of which are now gone.
    forgetBulkMoveReport()
    bulkDelete.mutate(
      { ids: selectedIds },
      {
        onSuccess: () => {
          selection.clear()
          setIsConfirmingDelete(false)
        },
      },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Heading level="page">Tickets</Heading>
          <Text tone="muted">Every support request in the queue.</Text>
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

            <CardBody className="grid gap-4 sm:grid-cols-3">
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
            </CardBody>
          </Card>

          <Card className="overflow-hidden">
            <TicketsToolbar
              onExport={() => void csv.exportCsv()}
              isExporting={csv.isExporting}
              disabled={tickets.isPending || total === 0}
              error={csv.error}
            />

            {canManageTickets && selectedIds.length > 0 ? (
              <BulkActionsBar
                selectedCount={selectedIds.length}
                isBusy={isBulkBusy}
                onApplyMove={applyBulkMove}
                onDelete={() => setIsConfirmingDelete(true)}
              />
            ) : null}

            {/* Outside the bar, because a move that reaches every ticket in the
                selection empties it and takes the bar with it. */}
            <BulkMoveReport result={bulkMove} />

            {loadError ? (
              <Alert
                tone="danger"
                variant="band"
                action={
                  <Button variant="secondary" size="sm" onClick={() => void tickets.refetch()}>
                    Try again
                  </Button>
                }
              >
                {loadError}
              </Alert>
            ) : null}

            <TicketsTable
              tickets={rows}
              isLoading={tickets.isPending}
              selectable={canManageTickets}
              selectedIds={selectedIds}
              onToggleTicket={selection.toggle}
              onToggleAll={selection.toggleAll}
            />

            <Pagination
              page={tickets.data?.page ?? 1}
              pageCount={tickets.data?.pageCount ?? 1}
              total={total}
              pageSize={PAGE_SIZE}
              disabled={tickets.isFetching}
              onPageChange={changePage}
            />
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={isConfirmingDelete}
        onClose={() => setIsConfirmingDelete(false)}
        onConfirm={confirmBulkDelete}
        title="Delete selected tickets"
        description={`This permanently removes ${selectedIds.length} ${
          selectedIds.length === 1 ? 'ticket' : 'tickets'
        }. This cannot be undone.`}
        confirmLabel="Delete tickets"
        busyLabel="Deleting…"
        isDanger
        isBusy={isBulkBusy}
      />
    </div>
  )
}
