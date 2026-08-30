import { useState } from 'react'
import { Alert, Button, Card, ConfirmDialog, Heading, Text, Toolbar } from '@harness-sample/ui'
import { toErrorMessage } from '@/lib/api/http'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { MAX_CUSTOMER_BULK_IDS, type CustomerPlan } from '@harness-sample/shared'
import { useRole } from '@/features/roles/useRole'
import { CustomerDrawer } from './components/CustomerDrawer'
import { CustomerList } from './components/CustomerList'
import { CustomersBulkActionsBar } from './components/CustomersBulkActionsBar'
import { CustomersToolbar } from './components/CustomersToolbar'
import { DEFAULT_FILTERS, toListCustomersFilters, type CustomerFilters } from './customerFilters'
import { useBulkDeleteCustomers } from './hooks/useBulkDeleteCustomers'
import { useBulkUpdateCustomerPlan } from './hooks/useBulkUpdateCustomerPlan'
import { useCustomers } from './hooks/useCustomers'
import { useCustomersExport } from './hooks/useCustomersExport'

/**
 * Everyone who uses the product.
 *
 * Deliberately not built like the ticket list, because the two are not the same
 * kind of screen and this repo holds both patterns on purpose:
 *
 * - A dense list rather than a table. Rows are scanned down for a person, not
 *   read across for a field, so each one leads with a face and a name.
 * - A cursor and a load-more rather than page numbers. The list grows; nobody
 *   goes to page four of their customers looking for someone.
 * - A drawer rather than a route. Opening a customer is a glance taken while
 *   working through the list, and a glance should not be a history entry.
 * - A set filter rather than a widened single value. "Pro and Enterprise" is a
 *   question a `<select>` cannot ask.
 *
 * The bulk actions follow the list rather than the table, and the difference is
 * what "everything" means. A ticket selection is bounded by the page it was made
 * on; this one spans every page loaded so far and keeps spanning them as more
 * arrive, which is why the select-all is on the bar rather than in a header, and
 * why the selection is filtered against the rows on screen rather than reset
 * whenever the list changes underneath it.
 */

/** Enough rows to fill a screen and a bit, so the first load-more is a choice. */
const PAGE_SIZE = 20

/** Long enough that typing a word is one request, short enough to feel live. */
const SEARCH_DEBOUNCE_MS = 250

function customerLabel(count: number): string {
  return count === 1 ? '1 customer' : `${String(count)} customers`
}

export function CustomersPage() {
  const { canManageCustomers } = useRole()

  const [filters, setFilters] = useState<CustomerFilters>(DEFAULT_FILTERS)
  const [openCustomerId, setOpenCustomerId] = useState<string | null>(null)
  const [selection, setSelection] = useState<string[]>([])
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

  // The field stays instant. Only the request, and the cache key built from it,
  // wait for a pause in typing.
  const debouncedSearch = useDebouncedValue(filters.search, SEARCH_DEBOUNCE_MS)
  const query = toListCustomersFilters({ ...filters, search: debouncedSearch }, PAGE_SIZE)

  const customers = useCustomers(query)
  const bulkUpdatePlan = useBulkUpdateCustomerPlan()
  const bulkDelete = useBulkDeleteCustomers()

  // Handed the same filters the list is asking with, minus how much of it is on
  // screen: the file is everything they match, not the pages loaded so far.
  const csv = useCustomersExport(query)

  // Every page loaded so far, as one list. The pages are how it arrived, not how
  // it is read — nothing below this line knows where one ends and the next
  // begins, which is the point of a list that grows rather than turns.
  const rows = customers.data?.pages.flatMap((page) => page.rows) ?? []
  const total = customers.data?.pages[0]?.total ?? 0
  const loadError = customers.isError
    ? toErrorMessage(customers.error, 'Could not load customers.')
    : null

  // Derived rather than stored, so the selection cannot go stale: a row the
  // filters no longer match, one that has just been deleted, and every selection
  // at all once admin is lost, drop out without an effect having to reset them.
  // Rows only ever accumulate here, so load-more keeps what is already ticked.
  const selectedIds = canManageCustomers
    ? selection.filter((id) => rows.some((customer) => customer.id === id))
    : []

  const isBulkBusy = bulkUpdatePlan.isPending || bulkDelete.isPending

  // The two failures are reported in two places, because the two actions happen
  // in two places. A plan change is applied from the bar with nothing over the
  // list, so its failure is a band on the list. A delete is confirmed inside a
  // modal that is still open when the request comes back, and a band behind an
  // `aria-modal` dialog is a message a screen reader is told is not there and a
  // sighted reader has to dismiss the question to read.
  const planError = bulkUpdatePlan.error
    ? toErrorMessage(bulkUpdatePlan.error, 'Could not change those customers.')
    : null
  const deleteError = bulkDelete.error
    ? toErrorMessage(bulkDelete.error, 'Could not delete those customers.')
    : null

  /**
   * No page to reset, and nothing else to tidy up. A new filter is a new list,
   * and the cache key changing is what starts it from the top.
   *
   * The drawer is deliberately left alone. It holds an id and fetches by it, so
   * it does not care what the list underneath is showing — and closing it here
   * would take focus back to the row it came from while someone is still typing
   * in the search field.
   *
   * The selection is left alone for the same reason it is derived: a row the new
   * filters do not match stops counting on its own, and comes back still ticked
   * if the filter that hid it is undone.
   *
   * The band is not left alone. It is about rows that are about to leave.
   */
  function changeFilters(patch: Partial<CustomerFilters>) {
    forgetBulkFailure()
    setFilters((current) => ({ ...current, ...patch }))
  }

  /**
   * Drops the band over the list, which is a report on one selection and one set
   * of rows: when either of those goes, a message about them is pinned over a
   * screen it is no longer describing. The load-error band beneath it clears
   * itself because it is query state; this one is mutation state, which is held
   * until something asks for it to be let go.
   *
   * Only when the mutation has actually failed. `reset()` on one that is still
   * running takes the `onSuccess` waiting to run with it — the callbacks handed
   * to `mutate` belong to the observer's current mutation — and the filters are
   * not disabled while a bulk action is in flight.
   *
   * Unmount needs nothing: mutation state belongs to the observer, so a screen
   * that is left and come back to comes back idle.
   */
  function forgetBulkFailure() {
    if (bulkUpdatePlan.isError) {
      bulkUpdatePlan.reset()
    }
  }

  function toggleSelected(id: string, isSelected: boolean) {
    setSelection((current) =>
      isSelected ? [...current, id] : current.filter((value) => value !== id),
    )
  }

  /**
   * Adds every row on screen to the selection rather than becoming it.
   *
   * The stored selection is wider than what is on screen on purpose — a row the
   * filters no longer match drops out of the count and comes back still ticked —
   * so replacing it here would throw away every remembered tick the current
   * filters happen to hide, invisibly, because those ids were not being counted
   * anyway. `toggleSelected` and `forgetSelected` both hold that model; this is
   * the third place that has to.
   *
   * Capped at what one request may carry. This is the only control that can grow
   * a selection in leaps — a hundred rows a load-more, and no ceiling on the
   * load-mores — so it is where a selection that outgrows a bulk body would come
   * from, and the cap belongs where the growing happens rather than at the schema
   * that would otherwise reject the result.
   */
  function selectAllLoaded() {
    setSelection((current) =>
      [
        ...current,
        ...rows.map((customer) => customer.id).filter((id) => !current.includes(id)),
      ].slice(0, MAX_CUSTOMER_BULK_IDS),
    )
  }

  /**
   * Drops the ids an action has finished with, rather than emptying the
   * selection: a request is in flight for a while, and anything ticked in the
   * meantime was not part of what was just done.
   */
  function forgetSelected(ids: readonly string[]) {
    setSelection((current) => current.filter((id) => !ids.includes(id)))
  }

  function applyPlan(plan: CustomerPlan) {
    const ids = selectedIds

    // Nothing to reset for the delete: its failure lives inside the dialog, and
    // a closed dialog renders none of it. The reverse is not true, which is why
    // `confirmDelete` still resets this one.
    bulkUpdatePlan.mutate({ ids, plan }, { onSuccess: () => forgetSelected(ids) })
  }

  /**
   * Asking again starts from a clean question. The reset is on the way in rather
   * than on the way out because `mutate`'s callbacks belong to the observer that
   * is being reset: dismissing a confirmation while its request is still in
   * flight is a real sequence here, and resetting then would drop the `onSuccess`
   * that closes the drawer over a customer that has just been deleted.
   */
  function askToDelete() {
    bulkDelete.reset()
    setIsConfirmingDelete(true)
  }

  function confirmDelete() {
    const ids = selectedIds

    // A plan change that failed would otherwise keep its band above the list
    // through a delete that worked, since a mutation holds its error until it is
    // asked to run again.
    bulkUpdatePlan.reset()
    bulkDelete.mutate(
      { ids },
      {
        onSuccess: () => {
          // The drawer holds an id and nothing else, so a customer deleted from
          // under it would sit there refetching a 404. Read through the updater
          // rather than off this closure: Escape dismisses the confirmation
          // while the request is still in flight, which leaves the list — and so
          // the drawer — reachable again, and what is open now is not what was
          // open when this went out.
          setOpenCustomerId((current) =>
            current !== null && ids.includes(current) ? null : current,
          )

          forgetSelected(ids)
          setIsConfirmingDelete(false)
        },
      },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Heading level="page">Customers</Heading>
        <Text tone="muted">Everyone using the product, and what they have raised.</Text>
      </div>

      <Card className="overflow-hidden">
        <CustomersToolbar
          filters={filters}
          onChange={changeFilters}
          total={total}
          loaded={rows.length}
          isLoading={customers.isPending}
          onExport={() => void csv.exportCsv()}
          isExporting={csv.isExporting}
          exportError={csv.error}
        />

        {selectedIds.length > 0 ? (
          <CustomersBulkActionsBar
            selectedCount={selectedIds.length}
            loadedCount={rows.length}
            maxBulkIds={MAX_CUSTOMER_BULK_IDS}
            onSelectAll={selectAllLoaded}
            onDeselectAll={() => forgetSelected(rows.map((customer) => customer.id))}
            onClearSelection={() => {
              forgetBulkFailure()
              setSelection([])
            }}
            onApplyPlan={applyPlan}
            onDelete={askToDelete}
            isBusy={isBulkBusy}
          />
        ) : null}

        {planError ? (
          <Alert tone="danger" variant="band">
            {planError}
          </Alert>
        ) : null}

        {loadError ? (
          <Alert
            tone="danger"
            variant="band"
            action={
              <Button variant="secondary" size="sm" onClick={() => void customers.refetch()}>
                Try again
              </Button>
            }
          >
            {loadError}
          </Alert>
        ) : null}

        <CustomerList
          customers={rows}
          isLoading={customers.isPending}
          openCustomerId={openCustomerId}
          onOpen={setOpenCustomerId}
          isSelectable={canManageCustomers}
          selectedIds={selectedIds}
          onToggleSelected={toggleSelected}
        />

        {/* The end of the list, not a paginator. There is no page number to
            show because there are no pages to go back to — only more. */}
        {customers.hasNextPage ? (
          <Toolbar divider="top" className="justify-center">
            <Button
              variant="secondary"
              onClick={() => void customers.fetchNextPage()}
              disabled={customers.isFetchingNextPage}
            >
              {customers.isFetchingNextPage ? 'Loading…' : 'Load more customers'}
            </Button>
          </Toolbar>
        ) : null}
      </Card>

      <CustomerDrawer customerId={openCustomerId} onClose={() => setOpenCustomerId(null)} />

      <ConfirmDialog
        open={isConfirmingDelete}
        onClose={() => setIsConfirmingDelete(false)}
        onConfirm={confirmDelete}
        title="Delete selected customers"
        description={`This permanently removes ${customerLabel(
          selectedIds.length,
        )}. The tickets they raised stay in the queue. This cannot be undone.`}
        confirmLabel="Delete customers"
        busyLabel="Deleting…"
        error={deleteError}
        isDanger
        isBusy={isBulkBusy}
      />
    </div>
  )
}
