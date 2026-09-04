import type { UseMutationResult } from '@tanstack/react-query'
import { Alert, Text } from '@support-desk/ui'
import type { BulkTicketMoveBody, BulkTicketMoveResponse } from '@support-desk/shared'
import { toErrorMessage } from '@/lib/api/http'

interface BulkMoveReportProps {
  result: UseMutationResult<BulkTicketMoveResponse, Error, BulkTicketMoveBody>
}

/**
 * A selection is not one ticket, so a bulk move is not one outcome, and the
 * useful summary is the split rather than a total.
 */
function summarise({ moved, left }: BulkTicketMoveResponse): string {
  const count = `${String(moved.length)} ${moved.length === 1 ? 'ticket' : 'tickets'} moved`

  if (left.length === 0) {
    return `${count}.`
  }

  return `${count}. ${String(left.length)} ${
    left.length === 1 ? 'was' : 'were'
  } left where they were.`
}

/**
 * The conditions that stopped the rest, each said once.
 *
 * Forty tickets refused for one reason is one sentence, not forty. Which
 * tickets they were is in the response too, and the list page uses it: those
 * rows stay ticked, so the next thing done is about them.
 */
function requirementsIn({ left }: BulkTicketMoveResponse): string[] {
  return [...new Set(left.map((refusal) => refusal.requirement))]
}

/**
 * What a bulk move did, as a band across the card.
 *
 * It reports a mutation, so it is handed the mutation. The alternative was three
 * props worked out at the call site — the outcome, the error, and which of the
 * two to believe — and `TicketListPage` is not the place for that arithmetic: it
 * is one function already at the edge of two of this repository's thresholds,
 * and every branch spent there is a branch a reader has to hold.
 *
 * **It sits outside the bulk bar rather than in it**, and that is the whole
 * reason it is a component of its own. A move that succeeds for every ticket
 * empties the selection, which takes the bar off screen — so a report living in
 * the bar would disappear in exactly the case where it had the best news to
 * deliver. This one survives, and keeps saying what happened until the next
 * move is made.
 */
export function BulkMoveReport({ result }: BulkMoveReportProps) {
  if (result.isError) {
    return (
      <Alert tone="danger" variant="band">
        {toErrorMessage(result.error, 'Could not move the selected tickets.')}
      </Alert>
    )
  }

  if (!result.isSuccess) {
    return null
  }

  return (
    <Alert
      tone={result.data.left.length === 0 ? 'success' : 'warning'}
      variant="band"
      title={summarise(result.data)}
    >
      {requirementsIn(result.data).map((requirement) => (
        <Text key={requirement} size="caption">
          {requirement}
        </Text>
      ))}
    </Alert>
  )
}
