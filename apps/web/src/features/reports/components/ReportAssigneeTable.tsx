import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/design-system'
import {
  TICKET_STATUSES,
  TICKET_STATUS_LABELS,
  type ReportAssigneesResponse,
} from '@harness-sample/shared'

interface ReportAssigneeTableProps {
  assignees: ReportAssigneesResponse | undefined
  isLoading: boolean
}

/** The assignee column, one column per status, and a total. */
const COLUMN_COUNT = TICKET_STATUSES.length + 2

/**
 * The same range as the charts, by the person holding the ticket.
 *
 * The status columns are generated from the domain union rather than written
 * out, so a status added to the queue appears here without this file changing —
 * and cannot be silently left out of a row that still adds up to its total.
 */
export function ReportAssigneeTable({ assignees, isLoading }: ReportAssigneeTableProps) {
  const rows = assignees?.rows ?? []

  return (
    <Table caption="Tickets by assignee">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Assignee</TableHeaderCell>
          {TICKET_STATUSES.map((status) => (
            <TableHeaderCell key={status} className="text-right">
              {TICKET_STATUS_LABELS[status]}
            </TableHeaderCell>
          ))}
          <TableHeaderCell className="text-right">Total</TableHeaderCell>
        </TableRow>
      </TableHead>

      <TableBody
        columnCount={COLUMN_COUNT}
        isLoading={isLoading}
        isEmpty={rows.length === 0}
        loadingMessage="Loading report…"
        emptyMessage="No tickets were raised in this range."
      >
        {rows.map((row) => (
          <TableRow key={row.assignee}>
            <TableCell className="font-medium">{row.assignee}</TableCell>
            {TICKET_STATUSES.map((status) => (
              <TableCell key={status} className="text-right tabular-nums text-fg-muted">
                {row.byStatus[status]}
              </TableCell>
            ))}
            <TableCell className="text-right font-semibold tabular-nums">{row.total}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
