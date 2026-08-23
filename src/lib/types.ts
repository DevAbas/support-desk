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
