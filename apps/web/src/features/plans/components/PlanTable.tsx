import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Text,
} from '@support-desk/ui'
import { CUSTOMER_PLAN_LABELS, type CustomerPlan, type CustomerPlanRow } from '@support-desk/shared'
import { CustomerPlanBadge } from '@/features/customers/components/CustomerPlanBadge'
import { formatMonthlyPrice, formatSeatLimit } from '../planFormat'

interface PlanTableProps {
  rows: readonly CustomerPlanRow[]
  isLoading: boolean
  /**
   * Handed the plan rather than the row, because the plan is what the screen
   * holds while the dialog is open: a row captured here would be the copy the
   * count was read off, and the dialog would go on showing it after a refetch.
   */
  onEdit: (plan: CustomerPlan) => void
}

/** Plan, what it is for, price, seats, who is on it, and the way to change it. */
const COLUMN_COUNT = 6

interface PlanTableRowProps {
  row: CustomerPlanRow
  onEdit: (plan: CustomerPlan) => void
}

/**
 * One plan.
 *
 * A component rather than the body of the `.map()` below, which is the rule the
 * threshold lint rules are a backstop for: a row that draws a badge, three
 * formatted figures and a control is a thing with a name.
 */
function PlanTableRow({ row, onEdit }: PlanTableRowProps) {
  return (
    <TableRow className="hover:bg-surface-muted">
      <TableCell>
        <CustomerPlanBadge plan={row.plan} />
      </TableCell>
      <TableCell>
        <Text tone="muted">{row.description}</Text>
      </TableCell>
      <TableCell className="text-right font-medium tabular-nums whitespace-nowrap">
        {formatMonthlyPrice(row.monthlyPricePence)}
      </TableCell>
      <TableCell className="text-right tabular-nums whitespace-nowrap text-fg-muted">
        {formatSeatLimit(row.seatLimit)}
      </TableCell>
      <TableCell className="text-right tabular-nums text-fg-muted">{row.customerCount}</TableCell>
      <TableCell className="text-right">
        {/* Named by the plan it edits, not by "Edit": four buttons with one name
            between them are four controls a screen reader cannot tell apart,
            which is the rule a `ListRow` checkbox already carries. */}
        <Button variant="ghost" size="sm" onClick={() => onEdit(row.plan)}>
          {`Edit ${CUSTOMER_PLAN_LABELS[row.plan]}`}
        </Button>
      </TableCell>
    </TableRow>
  )
}

/**
 * The catalogue, read across.
 *
 * A `Table` rather than the `List` the customer screen uses, and the two are the
 * pair this repository keeps on purpose. Four rows answering the same five
 * questions in the same order is a grid: what a person does here is compare
 * Starter's price against Pro's, which is a column. A customer row has a shape
 * instead — a face, a name, a quieter line under it — and is scanned down.
 *
 * The three figures are right-aligned and `tabular-nums`, so the digits line up
 * between rows and the comparison the screen exists for can be made by eye.
 *
 * The row tint is a reading aid across six columns, the same one the ticket
 * table uses, and deliberately not `interactive`: nothing here presses, and a
 * pressed state on a row that cannot be pressed is a promise the screen does not
 * keep. The control that does press is the button at the end of it.
 */
export function PlanTable({ rows, isLoading, onEdit }: PlanTableProps) {
  return (
    <Table caption="Customer plans, with what each one costs and how many customers are on it">
      <TableHead>
        <TableRow>
          <TableHeaderCell>Plan</TableHeaderCell>
          <TableHeaderCell>For</TableHeaderCell>
          <TableHeaderCell className="text-right">Per month</TableHeaderCell>
          <TableHeaderCell className="text-right">Seats</TableHeaderCell>
          <TableHeaderCell className="text-right">Customers</TableHeaderCell>
          {/* The column of edit buttons has no question to head, and a heading
              invented for it would be read out on every row. */}
          <TableHeaderCell>
            <span className="sr-only">Actions</span>
          </TableHeaderCell>
        </TableRow>
      </TableHead>

      <TableBody
        columnCount={COLUMN_COUNT}
        isLoading={isLoading}
        loadingMessage="Loading plans…"
        // No empty state: the plans are a closed union, so a catalogue with no
        // rows in it is a broken response rather than a screen somebody has
        // filtered down to nothing.
      >
        {rows.map((row) => (
          <PlanTableRow key={row.plan} row={row} onEdit={onEdit} />
        ))}
      </TableBody>
    </Table>
  )
}
