import { Alert, Button } from '@harness-sample/ui'

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
      {/* An export that failed is an error, and `Alert` is what knows an error
          is announced assertively — this said it politely, through a
          `role="status"` written by hand. Its chrome is turned off because a
          line in a toolbar is not a callout: what is being reused is the tone
          and the role it picks from it, which is the part that was wrong. */}
      {error ? (
        <Alert tone="danger" className="mr-auto border-0 bg-transparent p-0">
          {error}
        </Alert>
      ) : null}

      <Button variant="secondary" size="sm" onClick={onExport} disabled={disabled || isExporting}>
        {isExporting ? 'Exporting…' : 'Export CSV'}
      </Button>
    </div>
  )
}
