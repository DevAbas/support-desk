import { describe, expect, it } from 'vitest'
import { TICKET_STATUSES, TICKET_TRANSITION_IDS, UNASSIGNED, type TicketStatus } from './types'
import {
  evaluateTicketMove,
  ticketMoveNeedsReason,
  ticketMoveOffers,
  ticketStatusRank,
  ticketTransition,
  ticketTransitionsFrom,
  TICKET_GUARDS,
} from './workflow'

/**
 * The workflow, tested as the data it is.
 *
 * Two kinds of case are here and they are worth telling apart. The first three
 * describes are **invariants over the whole table** — every status reachable,
 * every dead end reopenable, every backward move carrying a reason — and they
 * are the ones that matter when somebody adds a fifth status or a seventh move.
 * They fail for a table that is wrong rather than for a function that is, which
 * is the only way a table gets held to a rule.
 *
 * The rest are the specific refusals this product decided on.
 */

/** Every status, plus how you get out of it, in one place for the loops below. */
const statuses: readonly TicketStatus[] = TICKET_STATUSES

describe('the shape of the workflow', () => {
  it('can reach every status from open', () => {
    const reached = new Set<TicketStatus>(['open'])

    // Breadth-first from where a ticket is raised. A status nothing reaches is
    // a status the filters, the saved views and the reports all offer and
    // nothing can ever be in.
    for (let pass = 0; pass < statuses.length; pass += 1) {
      for (const status of [...reached]) {
        for (const transition of ticketTransitionsFrom(status)) {
          reached.add(transition.to)
        }
      }
    }

    expect([...reached].sort()).toEqual([...statuses].sort())
  })

  it('leaves no status a dead end', () => {
    for (const status of statuses) {
      expect(ticketTransitionsFrom(status).length).toBeGreaterThan(0)
    }
  })

  it('asks for a reason on every move that takes a ticket backwards', () => {
    const backwards = TICKET_TRANSITION_IDS.map(ticketTransition).filter(
      (transition) => ticketStatusRank(transition.to) < ticketStatusRank(transition.from),
    )

    // Not a restatement of the table: this is the rule the table claims to
    // follow, checked against it. A seventh move added without a reason guard
    // fails here rather than shipping as a quiet way to undo something.
    expect(backwards.map((transition) => transition.id)).toEqual(['reject', 'release', 'reopen'])
    expect(backwards.every((transition) => ticketMoveNeedsReason(transition.id))).toBe(true)
  })

  it('asks for a reason on nothing that takes a ticket forwards', () => {
    const forwards = TICKET_TRANSITION_IDS.map(ticketTransition).filter(
      (transition) => ticketStatusRank(transition.to) > ticketStatusRank(transition.from),
    )

    expect(forwards.every((transition) => !ticketMoveNeedsReason(transition.id))).toBe(true)
  })

  it('names a guard that exists on every move that has one', () => {
    for (const id of TICKET_TRANSITION_IDS) {
      for (const guard of ticketTransition(id).guards) {
        expect(TICKET_GUARDS[guard].id).toBe(guard)
      }
    }
  })
})

describe('evaluateTicketMove', () => {
  const owned = { status: 'pending', assignee: 'Priya Raman' } as const
  const unowned = { status: 'open', assignee: UNASSIGNED } as const

  it('allows a move whose conditions are all met', () => {
    const verdict = evaluateTicketMove('resolve', { ticket: owned, reason: '' }, 'agent')

    expect(verdict.allowed).toBe(true)
  })

  it('refuses a move out of somewhere the ticket is not, naming both positions', () => {
    const verdict = evaluateTicketMove('close', { ticket: owned, reason: '' }, 'admin')

    expect(verdict).toEqual({
      allowed: false,
      refusal: {
        kind: 'position',
        requirement: 'Close is a move out of Resolved, and this ticket is Pending.',
      },
    })
  })

  it('refuses to resolve a ticket nobody owns, and says what is missing', () => {
    const verdict = evaluateTicketMove(
      'resolve',
      { ticket: { status: 'pending', assignee: UNASSIGNED }, reason: '' },
      'agent',
    )

    expect(verdict.allowed).toBe(false)
    expect(verdict.allowed ? '' : verdict.refusal).toEqual({
      kind: 'guard',
      requirement: TICKET_GUARDS.assigned.requirement,
    })
  })

  it('cannot be talked into resolving an unowned ticket in one step either', () => {
    // There is no `open` to `resolved` move at all, which is what makes the
    // rule structural rather than checked in one place.
    expect(ticketTransitionsFrom('open').map((transition) => transition.to)).toEqual(['pending'])
    expect(evaluateTicketMove('start', { ticket: unowned, reason: '' }, 'agent').allowed).toBe(
      false,
    )
  })

  it('refuses an agent a move that is not theirs, naming who it is for', () => {
    const closed = { status: 'closed', assignee: 'Priya Raman' } as const

    expect(
      evaluateTicketMove('reopen', { ticket: closed, reason: 'Back again.' }, 'agent'),
    ).toEqual({
      allowed: false,
      refusal: { kind: 'role', requirement: 'Reopen is for administrators.' },
    })

    expect(
      evaluateTicketMove('reopen', { ticket: closed, reason: 'Back again.' }, 'admin').allowed,
    ).toBe(true)
  })

  it('refuses a backward move with nothing but whitespace for a reason', () => {
    const resolved = { status: 'resolved', assignee: 'Priya Raman' } as const

    expect(
      evaluateTicketMove('reject', { ticket: resolved, reason: '   ' }, 'agent').allowed,
    ).toBe(false)
    expect(
      evaluateTicketMove('reject', { ticket: resolved, reason: 'Still broken.' }, 'agent').allowed,
    ).toBe(true)
  })

  it('reports the position before the role, so a move nobody has is not a permissions problem', () => {
    // An agent asking to reopen an open ticket is asking for something that
    // does not exist. Telling them it is for administrators would send them to
    // find one.
    const verdict = evaluateTicketMove('reopen', { ticket: unowned, reason: 'why' }, 'agent')

    expect(verdict.allowed ? null : verdict.refusal.kind).toBe('position')
  })
})

describe('ticketMoveOffers', () => {
  it('offers a move blocked by the ticket, carrying what is missing', () => {
    expect(ticketMoveOffers({ status: 'open', assignee: UNASSIGNED }, 'agent')).toEqual([
      { id: 'start', available: false, requirement: TICKET_GUARDS.assigned.requirement },
    ])
  })

  it('offers it plainly once the ticket has an owner', () => {
    expect(ticketMoveOffers({ status: 'open', assignee: 'Ren Nakamura' }, 'agent')).toEqual([
      { id: 'start', available: true, requirement: null },
    ])
  })

  it('offers a reason-guarded move as available, because the reason is not a fact about the ticket', () => {
    const offers = ticketMoveOffers({ status: 'resolved', assignee: 'Ren Nakamura' }, 'agent')

    expect(offers).toEqual([
      { id: 'close', available: true, requirement: null },
      { id: 'reject', available: true, requirement: null },
    ])
    expect(ticketMoveNeedsReason('reject')).toBe(true)
  })

  it('leaves out a move the role may not make rather than showing it blocked', () => {
    const closed = { status: 'closed', assignee: 'Ren Nakamura' } as const

    // A control greyed out with "this is for administrators" is a screen
    // telling somebody about a power they do not have.
    expect(ticketMoveOffers(closed, 'agent')).toEqual([])
    expect(ticketMoveOffers(closed, 'admin')).toEqual([
      { id: 'reopen', available: true, requirement: null },
    ])
  })

  it('puts the forward move first, so a screen needs no order of its own', () => {
    const offers = ticketMoveOffers({ status: 'pending', assignee: 'Ren Nakamura' }, 'agent')

    expect(offers.map((offer) => offer.id)).toEqual(['resolve', 'release'])
  })
})
