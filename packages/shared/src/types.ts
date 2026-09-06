/** The shared domain vocabulary. The API contract and the feature screens both speak it. */

export const ROLES = ['agent', 'admin'] as const

export type Role = (typeof ROLES)[number]

/**
 * The four statuses, **in workflow order**.
 *
 * They were always written in this order and it was always the order support
 * work happens in; what changed is that the order is now load-bearing —
 * `ticketStatusRank` in `workflow.ts` reads position out of this array, and a
 * move that lowers the rank is a move that has to say why.
 *
 * Nothing that reads this array for its members has to know that. The filters,
 * the bulk bar, the saved views, the reports and the CSV export all want the set
 * of statuses, and the set is unchanged.
 */
export const TICKET_STATUSES = ['open', 'pending', 'resolved', 'closed'] as const

export type TicketStatus = (typeof TICKET_STATUSES)[number]

export const TICKET_PRIORITIES = ['low', 'medium', 'high'] as const

export type TicketPriority = (typeof TICKET_PRIORITIES)[number]

/**
 * The assignee a ticket carries when nobody owns it.
 *
 * An assignee is free text in this domain — there is no roster to pick from — so
 * "nobody" has to be a value that string can take rather than an absent field,
 * and the queue has always spelled it this way. It is a constant now because the
 * workflow reads it: `assigned` is the condition that stops a ticket being
 * worked before someone owns it, and a condition comparing against a literal
 * typed out in three places stops holding the day one of them is spelled
 * differently.
 */
export const UNASSIGNED = 'Unassigned'

/**
 * The named moves between statuses, in the order an interface should offer them.
 *
 * The names are domain vocabulary the same way the statuses are — a support desk
 * talks about resolving a ticket and reopening one — so they live here, beside
 * them. What each move connects, who may make it and what has to be true first
 * is the workflow, and that is `workflow.ts`.
 *
 * Forward moves come first within each status, so a screen offering the moves out
 * of `resolved` puts Close ahead of Not fixed without deciding an order of its own.
 */
export const TICKET_TRANSITION_IDS = [
  'start',
  'resolve',
  'close',
  'reject',
  'release',
  'reopen',
] as const

export type TicketTransitionId = (typeof TICKET_TRANSITION_IDS)[number]

/**
 * One move a ticket has made, as it is kept.
 *
 * The history exists because of the moves that go backwards. A ticket that is
 * reopened, or whose resolution is rejected, is a ticket somebody has to pick up
 * again, and the only useful answer to "why is this open again?" is the sentence
 * the person who reopened it was made to write. Keeping the sentence is what
 * makes asking for it worth anything, and the next person to open the ticket is
 * who it is kept for.
 *
 * `reason` is null where the move required none. It is not the empty string,
 * because "no reason was asked for" and "a reason was asked for and left blank"
 * are different facts and the second one cannot be stored.
 */
export interface TicketMove {
  id: string
  transition: TicketTransitionId
  from: TicketStatus
  to: TicketStatus
  /** Whoever made it, by name — the same names the queue assigns tickets to. */
  by: string
  reason: string | null
  /** ISO 8601 timestamp. */
  at: string
}

export interface TicketComment {
  id: string
  author: string
  body: string
  /** ISO 8601 timestamp. */
  createdAt: string
}

export interface Ticket {
  id: string
  title: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  assignee: string
  /** ISO 8601 timestamp. */
  createdAt: string
  comments: TicketComment[]
  /**
   * Every move this ticket has made, oldest first.
   *
   * Empty on a ticket that has not moved since it was raised, which includes
   * every seeded ticket: the seed puts tickets straight into the status they are
   * in, and a history invented for them would be a record of moves nobody made.
   */
  history: TicketMove[]
}

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  pending: 'Pending',
  resolved: 'Resolved',
  closed: 'Closed',
}

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

export const CUSTOMER_PLANS = ['free', 'starter', 'pro', 'enterprise'] as const

export type CustomerPlan = (typeof CUSTOMER_PLANS)[number]

/**
 * One of the customer's tickets, as much of it as a customer screen needs.
 *
 * Not a `Ticket`: the description and the comments belong to the ticket screens,
 * and sending them with every customer would mean the drawer downloaded a
 * conversation nobody opened it to read.
 */
export interface CustomerTicketRef {
  id: string
  title: string
  status: TicketStatus
  priority: TicketPriority
  /** ISO 8601 timestamp. */
  createdAt: string
}

/**
 * A customer as a row in a list: everything the list draws, and nothing it does
 * not. `ticketCount` is here rather than `tickets` because a row shows how many
 * there are, and sixty rows carrying their tickets would be the whole queue
 * fetched to render a number.
 */
export interface CustomerSummary {
  id: string
  name: string
  company: string
  email: string
  /** A picture of them, or null. `Avatar` falls back to their initials. */
  avatarUrl: string | null
  plan: CustomerPlan
  /** ISO 8601 calendar date, not an instant: nobody signs up at a time. */
  signupDate: string
  ticketCount: number
}

/** The whole customer, tickets included. What the detail endpoint answers with. */
export interface Customer extends CustomerSummary {
  tickets: CustomerTicketRef[]
}

export const CUSTOMER_PLAN_LABELS: Record<CustomerPlan, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
}

/**
 * What a plan costs and what it carries: the part of a plan an administrator
 * edits.
 *
 * The plan itself is not in that part, and the split is the whole design.
 * `CustomerPlan` is the *identity* — it is what a customer row stores, what the
 * list filters on, what a saved view is written in and what an exported CSV
 * says — so renaming Pro would rewrite yesterday's export and silently re-point
 * a stored filter at a plan nobody chose. The terms are the commercial facts
 * about that identity, and they are exactly what changes without the plan
 * becoming a different plan. Which is why `CUSTOMER_PLAN_LABELS` above stays the
 * one place a plan is named and there is no `name` field here.
 *
 * `seatLimit` is null on a plan that has no limit, rather than a very large
 * number. "Unlimited" is not a quantity, and a sentinel is a number every reader
 * has to know is not a number.
 *
 * The price is in pence and an integer, because money in a float is a rounding
 * error waiting for something to be totalled over it. What it reads as on screen
 * is the feature layer's, in `apps/web/src/features/plans/planFormat.ts`.
 */
export interface CustomerPlanTerms {
  plan: CustomerPlan
  monthlyPricePence: number
  /** Null where the plan carries no seat limit at all. */
  seatLimit: number | null
  /** One line saying who the plan is for, shown beside it wherever it is drawn. */
  description: string
}

/**
 * Someone who can sign in.
 *
 * Not every name the queue mentions is one of these: a ticket records its
 * assignee as a bare string, and `Unassigned` is a value that string can take.
 * A user is a person with a password, which is a smaller set.
 */
export interface User {
  id: string
  name: string
  email: string
  role: Role
  /** A picture of them, or null. `Avatar` falls back to their initials. */
  avatarUrl: string | null
}
