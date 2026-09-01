import { Alert, Button, Input, MultiSelect, Toolbar } from '@support-desk/ui'
import type { CustomerPlan } from '@support-desk/shared'
import { planOptions, type CustomerFilters } from '../customerFilters'

interface CustomersToolbarProps {
  filters: CustomerFilters
  onChange: (patch: Partial<CustomerFilters>) => void
  /** How many the filters match, and how many have been loaded so far. */
  total: number
  loaded: number
  isLoading: boolean
  onExport: () => void
  isExporting: boolean
  exportError: string | null
}

/**
 * The filters and the export, on one line above the list rather than in a card
 * of their own.
 *
 * A dense list is scanned, and the fewer rows the controls push off the screen
 * the better — which is a different trade from the ticket screen, where the
 * filters are a panel because a table is read one page at a time anyway. It is
 * also why the export sits on this line instead of in a strip of its own the way
 * `TicketsToolbar` is: a second bordered row above the list would cost two more
 * customers on screen to hold one button.
 *
 * Sitting beside the count is the right place for it besides. The file is
 * everything the filters match, and "Showing 20 of 60" is the sentence that says
 * what pressing it will produce.
 */
export function CustomersToolbar({
  filters,
  onChange,
  total,
  loaded,
  isLoading,
  onExport,
  isExporting,
  exportError,
}: CustomersToolbarProps) {
  return (
    <Toolbar className="items-end">
      <Input
        label="Search"
        type="search"
        value={filters.search}
        placeholder="Name, company or email"
        className="w-64"
        onChange={(event) => onChange({ search: event.target.value })}
      />

      <MultiSelect
        label="Plan"
        options={planOptions}
        value={filters.plans}
        placeholder="All plans"
        className="w-52"
        onChange={(plans: CustomerPlan[]) => onChange({ plans })}
      />

      {/* An export that failed is an error, and `Alert` is what knows an error
          is announced assertively. A line in a toolbar is not a callout, which
          is what the `inline` variant is: the row around it already has the
          padding and the border, so the message brings only the tone and the
          role that follows from it. */}
      {exportError ? (
        <Alert tone="danger" variant="inline">
          {exportError}
        </Alert>
      ) : null}

      <div className="ml-auto flex items-center gap-4">
        {/* Announced politely, because pressing load-more adds twenty rows below
            the fold and otherwise says nothing. Absent rather than saying so
            while the first page loads: the list already announces that, and two
            live regions reporting the same wait is one of them too many. */}
        {isLoading ? null : (
          <p role="status" aria-live="polite" className="text-body text-fg-muted">
            {`Showing ${String(loaded)} of ${String(total)}`}
          </p>
        )}

        {/* Disabled while there is nothing to export: the first page is still
            loading, or no customer matched. */}
        <Button
          variant="secondary"
          size="sm"
          onClick={onExport}
          disabled={isLoading || isExporting || total === 0}
        >
          {isExporting ? 'Exporting…' : 'Export CSV'}
        </Button>
      </div>
    </Toolbar>
  )
}
