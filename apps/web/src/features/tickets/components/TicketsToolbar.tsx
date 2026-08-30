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
    <div className="flex flex-wrap items-center justify-end gap-4 border-b border-border px-3 py-2">
      {/* An export that failed is an error, and `Alert` is what knows an error
          is announced assertively — this said it politely, through a
          `role="status"` written by hand. A line in a toolbar is not a callout,
          which is what the `inline` variant is: the row around it already has
          the padding and the border, so the message brings only the tone and
          the role that follows from it. */}
      {error ? (
        <Alert tone="danger" variant="inline" className="mr-auto">
          {error}
        </Alert>
      ) : null}

      <Button variant="secondary" size="sm" onClick={onExport} disabled={disabled || isExporting}>
        {isExporting ? 'Exporting…' : 'Export CSV'}
      </Button>
    </div>
  )
}
