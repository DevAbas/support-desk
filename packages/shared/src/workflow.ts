import { z } from 'zod'
import { bulkTicketIdsSchema, ticketTransitionIdSchema } from './contract'
import {
  ROLES,
  TICKET_STATUSES,
  TICKET_STATUS_LABELS,
  TICKET_TRANSITION_IDS,
  UNASSIGNED,
  type Role,
  type TicketStatus,
  type TicketTransitionId,
} from './types'

/**
 * The ticket workflow: which moves exist, who may make them, and what has to be
 * true first.
 *
 * A status used to be a value, and any of the four could be written over any
 * other. That is what let a ticket be resolved while nobody owned it and a
 * closed ticket become open again without anyone saying why — not a missing
 * check on a screen, but the absence of any notion that the statuses have an
 * order and that the steps between them are things a person does.
 *
 * **The whole workflow is this file, and it is data.** Three tables — the
 * statuses' order, the guards, the transitions — and four pure functions over
 * them. Adding a fifth status is an entry in `TICKET_STATUSES` and the moves
 * that reach it; no screen that renders a status has to change, because no
 * screen decides anything. `ticketMoveOffers` answers "what can be done here",
 * `evaluateTicketMove` answers "may this be done", and both sides call them:
 * the server to enforce, the interface to draw.
 *
 * **The server is still the authority.** The interface renders the offers the
 * server hands back rather than computing its own, because a guard reads ticket
 * state the browser may hold a stale copy of and because the role gate must not
 * have a second implementation in JavaScript. What the interface reads directly
 * out of these tables is presentation — a move's label, and whether committing it
 * asks for a reason — which is exactly the half a server should not be sending.
 *
 * **Nothing that reads `TICKET_STATUSES` for its members learns any of this.**
 * The filters, the saved views, the reports and the CSV export want the set of
 * statuses, and the set has not changed.
 */

/* -------------------------------------------------------------------------- */
/* The order                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Where a status sits in the sequence support work runs in: raised, picked up,
 * resolved, closed.
 *
 * Read out of `TICKET_STATUSES` rather than written down again, so the order and
 * the set cannot disagree. Its one use is telling a forward move from a backward
 * one, which is the rule the reason guard hangs off.
 */
export function ticketStatusRank(status: TicketStatus): number {
  return TICKET_STATUSES.indexOf(status)
}

/* -------------------------------------------------------------------------- */
/* The guards                                                                 */
/* -------------------------------------------------------------------------- */

export const TICKET_GUARD_IDS = ['assigned', 'reason'] as const

export type TicketGuardId = (typeof TICKET_GUARD_IDS)[number]

/**
 * What the ticket a move is being made against has to say for itself, plus
 * whatever came with the move.
 *
 * Deliberately not a `Ticket`. A guard reads a status and an assignee; handing it
 * the description and the comment thread would make every caller find a whole
 * ticket to ask a question about two fields, and the interface only ever holds a
 * summary of the rows it is about to act on.
 */
export interface TicketMoveSubject {
  status: TicketStatus
  assignee: string
}

export interface TicketMoveRequest {
  ticket: TicketMoveSubject
  /** Whatever reason was given, or `''`. */
  reason: string
}

/**
 * Whether a guard reads the ticket or the move.
 *
 * This is the distinction that decides what an interface can draw. A condition
 * about the ticket is knowable before anybody clicks, so a move it blocks is
 * offered disabled, with the condition as its hint — the person is told what is
 * missing rather than finding out by trying. A condition about the *move* cannot
 * be known in advance: the reason does not exist until it is typed, so the move
 * is offered, it asks, and only then can it fail.
 *
 * Collapsing the two would mean Reopen could not be offered until a reason
 * existed, and there would be nowhere to type one.
 */
export type TicketGuardReads = 'ticket' | 'move'

export interface TicketGuard {
  id: TicketGuardId
  reads: TicketGuardReads
  /**
   * What has to be true, written as the sentence shown when it is not.
   *
   * It says which condition failed and never that the move was refused. "That
   * action is not allowed" tells somebody they are stuck; "a ticket needs an
   * owner before it can be worked" tells them what to do next.
   */
  requirement: string
  holds: (request: TicketMoveRequest) => boolean
}

/**
 * Keyed by the union, so a guard named on a transition without being defined
 * here is a compile error rather than a condition that quietly always holds.
 */
export const TICKET_GUARDS: Record<TicketGuardId, TicketGuard> = {
  assigned: {
    id: 'assigned',
    reads: 'ticket',
    requirement:
      'A ticket needs an owner before it can be worked. Assign it to somebody, or take it yourself, and try again.',
    holds: ({ ticket }) => {
      const assignee = ticket.assignee.trim()

      return assignee !== '' && assignee !== UNASSIGNED
    },
  },
  reason: {
    id: 'reason',
    reads: 'move',
    requirement:
      'A move that takes a ticket backwards needs a reason, because the next person to open it is the one who has to read it.',
    holds: ({ reason }) => reason.trim() !== '',
  },
}

/* -------------------------------------------------------------------------- */
/* The transitions                                                            */
/* -------------------------------------------------------------------------- */

interface TicketTransitionSpec {
  from: TicketStatus
  to: TicketStatus
  /** The verb on the control that makes it. A move is something a person does. */
  label: string
  /** One line for the person about to make it. */
  description: string
  roles: readonly Role[]
  guards: readonly TicketGuardId[]
}

export interface TicketTransition extends TicketTransitionSpec {
  id: TicketTransitionId
}

/**
 * The moves, keyed by name.
 *
 * Keyed rather than listed, so that a name in `TICKET_TRANSITION_IDS` with no
 * entry here — or an entry with no name — does not compile. The display order is
 * the union's, so this table is free to read in whatever order explains it best.
 *
 * **Every move that lowers the rank requires a reason.** That is not six
 * independent decisions; it is one rule, and `workflow.test.ts` asserts it over
 * the table so a seventh move cannot be added that quietly skips it.
 *
 * **Reopening is administrators' work.** A closed ticket is the one state this
 * product treats as settled, and an agent working a queue should not be able to
 * unsettle it — which is the same line the bulk actions and deletion already
 * draw. Everything else is somebody's daily work and both roles have it.
 *
 * There is no move from `open` straight to `resolved`, and that is what makes
 * "a ticket cannot be resolved before somebody owns it" structural rather than
 * checked: the only way into `resolved` is out of `pending`, and the only way
 * into `pending` is a move that will not run on an unowned ticket. `resolve`
 * carries the same guard anyway, because a ticket can be handed back to
 * `Unassigned` after it was picked up.
 */
const TICKET_TRANSITIONS: Record<TicketTransitionId, TicketTransitionSpec> = {
  start: {
    from: 'open',
    to: 'pending',
    label: 'Start work',
    description: 'Take this off the queue and start working it.',
    roles: ROLES,
    guards: ['assigned'],
  },
  resolve: {
    from: 'pending',
    to: 'resolved',
    label: 'Resolve',
    description: 'An answer has gone back to the customer.',
    roles: ROLES,
    guards: ['assigned'],
  },
  close: {
    from: 'resolved',
    to: 'closed',
    label: 'Close',
    description: 'The resolution held. Nothing further is expected.',
    roles: ROLES,
    guards: [],
  },
  reject: {
    from: 'resolved',
    to: 'pending',
    label: 'Not fixed',
    description: 'The resolution did not hold, so the ticket goes back to being worked.',
    roles: ROLES,
    guards: ['reason'],
  },
  release: {
    from: 'pending',
    to: 'open',
    label: 'Return to queue',
    description: 'Hand this back for somebody else to pick up.',
    roles: ROLES,
    guards: ['reason'],
  },
  reopen: {
    from: 'closed',
    to: 'open',
    label: 'Reopen',
    description: 'Put a settled ticket back into the queue.',
    roles: ['admin'],
    guards: ['reason'],
  },
}

/** The move, with its name on it, so nothing has to carry the two separately. */
export function ticketTransition(id: TicketTransitionId): TicketTransition {
  return { id, ...TICKET_TRANSITIONS[id] }
}

/** Every move out of a status, in the order an interface should offer them. */
export function ticketTransitionsFrom(status: TicketStatus): TicketTransition[] {
  return TICKET_TRANSITION_IDS.filter((id) => TICKET_TRANSITIONS[id].from === status).map(
    ticketTransition,
  )
}

/**
 * Whether committing this move will ask for a reason.
 *
 * The one thing an interface reads out of the guard list directly, because it
 * decides whether the control opens a dialog or just moves the ticket. It is a
 * question about the move rather than about the ticket, which is why it is not
 * part of an offer.
 */
export function ticketMoveNeedsReason(id: TicketTransitionId): boolean {
  return TICKET_TRANSITIONS[id].guards.some((guard) => TICKET_GUARDS[guard].reads === 'move')
}

/* -------------------------------------------------------------------------- */
/* Asking, and answering                                                      */
/* -------------------------------------------------------------------------- */

export type TicketMoveRefusalKind = 'position' | 'role' | 'guard'

export interface TicketMoveRefusal {
  /**
   * Which kind of condition failed. The API reads it to pick a status code —
   * a role refusal is a 403 and the other two are a 409 — and nothing else
   * should need it: the sentence is the part a person is shown.
   */
  kind: TicketMoveRefusalKind
  requirement: string
}

export type TicketMoveVerdict =
  | { allowed: true; transition: TicketTransition }
  | { allowed: false; refusal: TicketMoveRefusal }

/**
 * Who a move is for, in the plural.
 *
 * Not `ROLE_LABELS` from the roles feature, which names the role a person *is*
 * — "Admin", in a byline. A refusal names the audience a move belongs to, and
 * those are different words. Keyed by the union so a third role cannot be added
 * without deciding what to call a group of them.
 */
const ROLE_AUDIENCES: Record<Role, string> = {
  agent: 'agents',
  admin: 'administrators',
}

function audienceFor(roles: readonly Role[]): string {
  return roles.map((role) => ROLE_AUDIENCES[role]).join(' and ')
}

/**
 * Whether this move can be made, and if not, which condition is not met.
 *
 * The three refusals are checked in the order a person would find them out.
 * Where the ticket is comes first, because a move out of somewhere else is not
 * a move this ticket has at all; then who is asking; then the conditions, in the
 * order the transition lists them.
 */
export function evaluateTicketMove(
  id: TicketTransitionId,
  request: TicketMoveRequest,
  role: Role,
): TicketMoveVerdict {
  const transition = ticketTransition(id)

  if (transition.from !== request.ticket.status) {
    return {
      allowed: false,
      refusal: {
        kind: 'position',
        requirement: `${transition.label} is a move out of ${TICKET_STATUS_LABELS[transition.from]}, and this ticket is ${TICKET_STATUS_LABELS[request.ticket.status]}.`,
      },
    }
  }

  if (!transition.roles.includes(role)) {
    return {
      allowed: false,
      refusal: {
        kind: 'role',
        requirement: `${transition.label} is for ${audienceFor(transition.roles)}.`,
      },
    }
  }

  const failed = transition.guards
    .map((guard) => TICKET_GUARDS[guard])
    .find((guard) => !guard.holds(request))

  if (failed) {
    return { allowed: false, refusal: { kind: 'guard', requirement: failed.requirement } }
  }

  return { allowed: true, transition }
}

/**
 * One move an interface may draw, and whether it can be made right now.
 *
 * Only the dynamic half is on the wire. The label, where the move goes and
 * whether it asks for a reason all come out of the tables above, which both
 * sides have — sending them would be the server dictating copy, and having the
 * client recompute `available` would be the client dictating the rules.
 */
export interface TicketMoveOffer {
  id: TicketTransitionId
  available: boolean
  /** The condition that is not met, where the move cannot be made. */
  requirement: string | null
}

/**
 * Every move this role may make out of where the ticket is, offered or blocked.
 *
 * A move the role may not make at all is absent: it is not theirs, and a control
 * greyed out with "this is for administrators" is a screen telling somebody
 * about a power they do not have. A move that is theirs but blocked by the
 * ticket is present and unavailable, carrying what is missing, because that is
 * something they can act on.
 *
 * Reason-guarded moves come back available. The reason is not a fact about the
 * ticket and does not exist yet — see `TicketGuardReads`.
 */
export function ticketMoveOffers(ticket: TicketMoveSubject, role: Role): TicketMoveOffer[] {
  return ticketTransitionsFrom(ticket.status)
    .filter((transition) => transition.roles.includes(role))
    .map((transition) => {
      const blocking = transition.guards
        .map((guard) => TICKET_GUARDS[guard])
        .filter((guard) => guard.reads === 'ticket')
        .find((guard) => !guard.holds({ ticket, reason: '' }))

      return {
        id: transition.id,
        available: blocking === undefined,
        requirement: blocking?.requirement ?? null,
      }
    })
}

/* -------------------------------------------------------------------------- */
/* The wire                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The longest reason this app will store. Long enough for a paragraph, short
 * enough that the history stays readable beside the conversation.
 */
export const MAX_MOVE_REASON_LENGTH = 500

export const ticketMoveOfferSchema: z.ZodType<TicketMoveOffer> = z.object({
  id: ticketTransitionIdSchema,
  available: z.boolean(),
  requirement: z.string().nullable(),
})

export const ticketMoveOffersResponseSchema = z.object({
  moves: z.array(ticketMoveOfferSchema),
})

export type TicketMoveOffersResponse = z.infer<typeof ticketMoveOffersResponseSchema>

/**
 * `reason` is always accepted and only sometimes required, and the requiring is
 * the workflow's rather than the schema's. A reason sent with a move that needs
 * none is dropped: it would be a sentence nobody was asked for, kept against a
 * move nobody will wonder about.
 */
export const ticketMoveBodySchema = z.object({
  move: ticketTransitionIdSchema,
  reason: z.string().trim().max(MAX_MOVE_REASON_LENGTH).optional(),
})

export type TicketMoveBody = z.infer<typeof ticketMoveBodySchema>

export const bulkTicketMoveBodySchema = bulkTicketIdsSchema.extend({
  move: ticketTransitionIdSchema,
  reason: z.string().trim().max(MAX_MOVE_REASON_LENGTH).optional(),
})

export type BulkTicketMoveBody = z.infer<typeof bulkTicketMoveBodySchema>

/**
 * What a bulk move answers with, and it is the answer to the question a mixed
 * selection asks.
 *
 * A selection is not one ticket, so a bulk move is not one outcome. The server
 * applies the move to every ticket that can take it and reports the rest by id
 * with the condition that stopped each — which lets the bar leave those rows
 * ticked and say what is missing, rather than reporting "7 of 10" and dropping
 * the three on the floor. A refusal every ticket shares collapses into one
 * sentence on screen; the ids are what makes the selection afterwards be about
 * the tickets that still need something.
 */
export const bulkTicketMoveResponseSchema = z.object({
  moved: z.array(z.string()),
  left: z.array(z.object({ id: z.string(), requirement: z.string() })),
})

export type BulkTicketMoveResponse = z.infer<typeof bulkTicketMoveResponseSchema>

export type BulkTicketMoveRefusal = BulkTicketMoveResponse['left'][number]
