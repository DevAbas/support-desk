import { Button } from '@harness-sample/ui'

interface PaginationProps {
  page: number
  pageCount: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
  disabled?: boolean
}

export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
  disabled = false,
}: PaginationProps) {
  const firstRow = total === 0 ? 0 : (page - 1) * pageSize + 1
  const lastRow = Math.min(page * pageSize, total)

  return (
    <nav
      aria-label="Ticket list pagination"
      className="flex items-center justify-between gap-4 border-t border-border px-3 py-2"
    >
      <p className="text-body text-fg-muted">
        {total === 0 ? 'No tickets' : `Showing ${firstRow}–${lastRow} of ${total}`}
      </p>

      <div className="flex items-center gap-2">
        <span className="text-body text-fg-muted">
          Page {page} of {pageCount}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || page <= 1}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || page >= pageCount}
        >
          Next
        </Button>
      </div>
    </nav>
  )
}
