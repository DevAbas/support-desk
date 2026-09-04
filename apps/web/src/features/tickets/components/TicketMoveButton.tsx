import { useId } from 'react'
import { Button, Text } from '@support-desk/ui'
import { ticketTransition, type TicketMoveOffer, type TicketTransition } from '@support-desk/shared'

interface TicketMoveButtonProps {
  /** What the server said about this move. */
  offer: TicketMoveOffer
  isBusy: boolean
  onSelect: (transition: TicketTransition) => void
}

/**
 * One move, as the control that makes it.
 *
 * A button named for the move rather than an option in a list of statuses: the
 * point of the workflow is that a status is somewhere a ticket gets taken, and
 * "Resolve" is a thing a person does where "Resolved" is a value they were
 * setting.
 *
 * **An unavailable move is drawn, disabled, with the condition under it.** The
 * alternative is leaving it out, and a person looking at an unassigned ticket
 * would then see a card with nothing in it and no way to find out why. The
 * condition is wired to the button with `aria-describedby`, because a disabled
 * control and a sentence that happens to sit beneath it are not connected for
 * anyone who cannot see the layout.
 *
 * An available move gets the transition's own description instead, which says
 * what making it means. Both lines come from the same place on screen, so the
 * hint is where a reader learns either.
 *
 * `secondary`, not `primary`. A screen gets one primary and this one already
 * spends it: reassigning and posting a comment are both the default variant.
 */
export function TicketMoveButton({ offer, isBusy, onSelect }: TicketMoveButtonProps) {
  const hintId = useId()
  const transition = ticketTransition(offer.id)

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant="secondary"
        aria-describedby={hintId}
        disabled={isBusy || !offer.available}
        onClick={() => onSelect(transition)}
      >
        {transition.label}
      </Button>
      <Text id={hintId} size="caption" tone="muted">
        {offer.requirement ?? transition.description}
      </Text>
    </div>
  )
}
