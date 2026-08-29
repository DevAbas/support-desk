import { Button } from '@harness-sample/ui'

interface TicketsToolbarProps {
  onExport: () => void
  isExporting?: boolean
  /** Nothing to export yet: the list is still loading, or nothing matched. */
  disabled?: boolean
  error?: string | null
}

/** The action bar sitting directly above the ticket list. */
export function TicketsToolbar({
  onExport,
  isExporting = false,
  disabled = false,
  error = null,
}: TicketsToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-4 border-b border-border px-4 py-3">
      {error ? (
        <p role="status" className="mr-auto text-sm text-danger-subtle-fg">
          {error}
        </p>
      ) : null}

      <Button variant="secondary" size="sm" onClick={onExport} disabled={disabled || isExporting}>
        {isExporting ? 'Exporting…' : 'Export CSV'}
      </Button>
    </div>
  )
}
