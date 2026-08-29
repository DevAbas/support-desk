import { Button, CardFooter, Text } from '@harness-sample/ui'

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
    // A real card footer: it sits in the footer slot of the card the report is
    // in, and its border, fill and padding were `CardFooter`'s copied out.
    <CardFooter className="flex-wrap justify-between gap-4">
      <Text tone="muted">Exports the view above, for the range selected.</Text>

      <Button variant="secondary" size="sm" onClick={onExport} disabled={disabled}>
        Export CSV
      </Button>
    </CardFooter>
  )
}
