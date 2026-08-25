/** The shared domain vocabulary. The API contract and the feature screens both speak it. */

export const ROLES = ['agent', 'admin'] as const

export type Role = (typeof ROLES)[number]

export const TICKET_STATUSES = ['open', 'pending', 'resolved', 'closed'] as const

export type TicketStatus = (typeof TICKET_STATUSES)[number]

export const TICKET_PRIORITIES = ['low', 'medium', 'high'] as const

export type TicketPriority = (typeof TICKET_PRIORITIES)[number]

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
