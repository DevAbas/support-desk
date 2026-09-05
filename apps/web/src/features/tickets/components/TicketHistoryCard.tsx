import { Card, CardBody, CardHeader, StateMessage, Text } from '@support-desk/ui'
import { ticketTransition, TICKET_STATUS_LABELS, type TicketMove } from '@support-desk/shared'
import { formatDateTime } from '@/lib/format'

interface TicketHistoryCardProps {
  history: readonly TicketMove[]
}

/**
 * How the ticket got where it is.
 *
 * The history is here because of the reason. Making somebody say why a ticket is
 * coming back is only worth anything if the sentence is kept, and the person it
 * is kept for is whoever opens the ticket next and wants to know why a closed
 * one is in their queue again. Without this card the reason guard would be a
 * form field that discards what it collects.
 *
 * Newest first, which is the other way round from the conversation beside it.
 * Comments are read as a thread from the beginning; a history is checked for
 * what just happened.
 *
 * Every seeded ticket has an empty one, and the empty state says as much rather
 * than apologising for it: the seed puts tickets straight into the status they
 * are in, and a history invented for them would be a record of moves nobody
 * made.
 */
export function TicketHistoryCard({ history }: TicketHistoryCardProps) {
  return (
    <Card>
      <CardHeader title="History" description="Every move this ticket has made." />

      {history.length === 0 ? (
        <StateMessage>Nothing yet. This ticket has not been moved.</StateMessage>
      ) : (
        <CardBody>
          <ol role="list" className="flex flex-col gap-4">
            {[...history].reverse().map((move) => (
              <TicketHistoryRow key={move.id} move={move} />
            ))}
          </ol>
        </CardBody>
      )}
    </Card>
  )
}

interface TicketHistoryRowProps {
  move: TicketMove
}

/**
 * One move.
 *
 * Its own component rather than a block inside the `.map()` above, which is the
 * house rule and also the honest reading of it: this is four elements and a
 * conditional, and that is the shape that grows.
 *
 * **The box is `CommentList`'s, written out again by hand.** "An entry in a log
 * inside a card" is a shape this app now draws twice — a comment and a move —
 * and the design system has no name for it, so both spell out the same four
 * classes. Matching the existing copy keeps the two logs looking alike; it does
 * not make this less of a copy, and the primitive it is asking for is called out
 * in the change that added this file.
 */
function TicketHistoryRow({ move }: TicketHistoryRowProps) {
  return (
    <li className="rounded-element border border-border bg-surface-muted p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Text className="font-medium">
          {`${ticketTransition(move.transition).label} by ${move.by}`}
        </Text>
        <time dateTime={move.at} className="text-caption text-fg-subtle">
          {formatDateTime(move.at)}
        </time>
      </div>

      <Text size="caption" tone="muted" className="mt-1">
        {`${TICKET_STATUS_LABELS[move.from]} to ${TICKET_STATUS_LABELS[move.to]}`}
      </Text>

      {/* Free text somebody typed under duress, so it wraps rather than
          widening the card the way one unbroken URL used to. */}
      {move.reason === null ? null : (
        <Text tone="muted" className="mt-2">
          {move.reason}
        </Text>
      )}
    </li>
  )
}
