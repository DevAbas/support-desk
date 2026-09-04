import { useState } from 'react'
import { Button, Select, Toolbar, type SelectOption } from '@support-desk/ui'
import {
  ticketMoveNeedsReason,
  ticketTransition,
  TICKET_STATUS_LABELS,
  TICKET_TRANSITION_IDS,
  type TicketTransition,
  type TicketTransitionId,
} from '@support-desk/shared'
import { TicketMoveReasonDialog } from './TicketMoveReasonDialog'

/**
 * Every move, named by where it starts.
 *
 * A selection spans statuses, so "Resolve" on its own does not say which of the
 * ticked rows it is about. Naming the status it comes out of turns the option
 * into a sentence about a subset — "Resolve (from Pending)" is exactly the rows
 * it will reach — which is why this bar does not need to work out counts in
 * advance to be honest about a mixed selection. It applies the move where the
 * move applies, and `BulkMoveReport` says what that turned out to be.
 *
 * Every move is offered, because this bar is administrators' only: the bulk
 * endpoint is behind the same gate as the other two, and an admin may make all
 * six. A role that could make some but not others would read this list off the
 * server, the way the detail card does.
 */
const moveOptions: readonly SelectOption<TicketTransitionId>[] = TICKET_TRANSITION_IDS.map((id) => {
  const transition = ticketTransition(id)

  return {
    value: id,
    label: `${transition.label} (from ${TICKET_STATUS_LABELS[transition.from]})`,
  }
})

/**
 * The move a bulk edit opens on, and goes back to once one has landed.
 *
 * A default is safe here where `CustomersBulkActionsBar` deliberately has none.
 * That bar opens on a placeholder because a default there is one click from
 * moving accounts onto Free — a billing change nobody asked for. A move is not
 * that: it is reversible from the same bar, it is refused where it does not
 * apply, and working a queue in bulk is nearly always working it down to
 * resolved. The reasoning still holds; it is a move now rather than a status.
 */
const DEFAULT_MOVE: TicketTransitionId = 'resolve'

interface BulkActionsBarProps {
  selectedCount: number
  /**
   * Handed the move to make and whatever reason was collected for it.
   *
   * What the move turned out to do is not handed back: it is reported from the
   * mutation by `BulkMoveReport`, which outlives this bar — see the note there.
   */
  onApplyMove: (move: TicketTransitionId, reason: string | undefined) => void
  onDelete: () => void
  isBusy?: boolean
}

/** Admin-only. The caller decides whether to render it; see TicketListPage. */
export function BulkActionsBar({
  selectedCount,
  onApplyMove,
  onDelete,
  isBusy = false,
}: BulkActionsBarProps) {
  const [move, setMove] = useState<TicketTransitionId>(DEFAULT_MOVE)
  const [asking, setAsking] = useState<TicketTransition | null>(null)

  function apply(reason?: string) {
    setAsking(null)
    onApplyMove(move, reason)
    // A move left on screen after the rows have gone reads as a change still
    // waiting to be applied.
    setMove(DEFAULT_MOVE)
  }

  function handleApply() {
    if (ticketMoveNeedsReason(move)) {
      setAsking(ticketTransition(move))
      return
    }

    apply()
  }

  return (
    <>
      <Toolbar
        aria-label="Bulk actions"
        role="group"
        className="items-end justify-between bg-primary-subtle"
      >
        <p className="text-body font-medium text-primary-subtle-fg">
          {selectedCount} {selectedCount === 1 ? 'ticket' : 'tickets'} selected
        </p>

        <div className="flex flex-wrap items-end gap-2">
          <Select
            label="Move"
            options={moveOptions}
            value={move}
            onChange={(event) => setMove(event.target.value as TicketTransitionId)}
            className="w-56"
            disabled={isBusy}
          />
          <Button size="md" onClick={handleApply} disabled={isBusy}>
            Apply
          </Button>
          <Button variant="danger" size="md" onClick={onDelete} disabled={isBusy}>
            Delete selected
          </Button>
        </div>
      </Toolbar>

      {asking ? (
        <TicketMoveReasonDialog
          transition={asking}
          isBusy={isBusy}
          onConfirm={(reason) => apply(reason)}
          onClose={() => setAsking(null)}
        />
      ) : null}
    </>
  )
}
