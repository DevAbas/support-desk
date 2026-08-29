import { Button } from '@harness-sample/ui'

interface ReportToolbarProps {
  onExport: () => void
  /** Nothing to export yet: the view is still loading, or the range is empty. */
  disabled?: boolean
}

/**
 * The action bar under the report views. What it exports is whichever view is
 * on screen, which is why it sits below them rather than in the page header.
 */
export function ReportToolbar({ onExport, disabled = false }: ReportToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border bg-surface-muted px-5 py-3">
      <p className="text-sm text-fg-muted">Exports the view above, for the range selected.</p>

      <Button variant="secondary" size="sm" onClick={onExport} disabled={disabled}>
        Export CSV
      </Button>
    </div>
  )
}
