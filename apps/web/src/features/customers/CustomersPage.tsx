import { useState } from 'react'
import { Alert, Button, Card, Heading, Text } from '@harness-sample/ui'
import { toErrorMessage } from '@/lib/api/http'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { CustomerDrawer } from './components/CustomerDrawer'
import { CustomerList } from './components/CustomerList'
import { CustomersToolbar } from './components/CustomersToolbar'
import { DEFAULT_FILTERS, toListCustomersFilters, type CustomerFilters } from './customerFilters'
import { useCustomers } from './hooks/useCustomers'

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
 */

/** Enough rows to fill a screen and a bit, so the first load-more is a choice. */
const PAGE_SIZE = 20

/** Long enough that typing a word is one request, short enough to feel live. */
const SEARCH_DEBOUNCE_MS = 250

export function CustomersPage() {
  const [filters, setFilters] = useState<CustomerFilters>(DEFAULT_FILTERS)
  const [openCustomerId, setOpenCustomerId] = useState<string | null>(null)

  // The field stays instant. Only the request, and the cache key built from it,
  // wait for a pause in typing.
  const debouncedSearch = useDebouncedValue(filters.search, SEARCH_DEBOUNCE_MS)
  const query = toListCustomersFilters({ ...filters, search: debouncedSearch }, PAGE_SIZE)

  const customers = useCustomers(query)

  // Every page loaded so far, as one list. The pages are how it arrived, not how
  // it is read — nothing below this line knows where one ends and the next
  // begins, which is the point of a list that grows rather than turns.
  const rows = customers.data?.pages.flatMap((page) => page.rows) ?? []
  const total = customers.data?.pages[0]?.total ?? 0
  const loadError = customers.isError
    ? toErrorMessage(customers.error, 'Could not load customers.')
    : null

  /**
   * No page to reset, and nothing else to tidy up. A new filter is a new list,
   * and the cache key changing is what starts it from the top.
   *
   * The drawer is deliberately left alone. It holds an id and fetches by it, so
   * it does not care what the list underneath is showing — and closing it here
   * would take focus back to the row it came from while someone is still typing
   * in the search field.
   */
  function changeFilters(patch: Partial<CustomerFilters>) {
    setFilters((current) => ({ ...current, ...patch }))
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
        />

        {loadError ? (
          // A band across the card rather than a card of its own, which is what
          // the rounding and the side borders are turned off for.
          <Alert
            tone="danger"
            className="items-center rounded-none border-x-0 border-t-0"
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
        />

        {/* The end of the list, not a paginator. There is no page number to
            show because there are no pages to go back to — only more. */}
        {customers.hasNextPage ? (
          <div className="flex justify-center border-t border-border px-4 py-3">
            <Button
              variant="secondary"
              onClick={() => void customers.fetchNextPage()}
              disabled={customers.isFetchingNextPage}
            >
              {customers.isFetchingNextPage ? 'Loading…' : 'Load more customers'}
            </Button>
          </div>
        ) : null}
      </Card>

      <CustomerDrawer customerId={openCustomerId} onClose={() => setOpenCustomerId(null)} />
    </div>
  )
}
