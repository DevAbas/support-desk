import {
  addCommentBodySchema,
  bulkDeleteBodySchema,
  bulkUpdateBodySchema,
  createTicketBodySchema,
  deletedCountSchema,
  listTicketsQuerySchema,
  listTicketsResponseSchema,
  ticketSchema,
  updateTicketBodySchema,
  updatedCountSchema,
  type AddCommentBody,
  type BulkDeleteBody,
  type BulkUpdateBody,
  type CreateTicketBody,
  type DeletedCount,
  type ListTicketsQuery,
  type ListTicketsResponse,
  type Ticket,
  type UpdateTicketBody,
  type UpdatedCount,
} from '@support-desk/shared'
import { apiRequest } from './http'

/**
 * One function per endpoint. These know about HTTP and nothing about React —
 * the hooks in `features/tickets/hooks` wrap them in queries and mutations.
 *
 * Request bodies are parsed on the way out as well as on the way in. The server
 * would reject a malformed one anyway; catching it here means the failure names
 * the field instead of arriving as a round trip and a 400.
 */

export function listTickets(
  query: ListTicketsQuery,
  signal?: AbortSignal,
): Promise<ListTicketsResponse> {
  return apiRequest('/tickets', {
    schema: listTicketsResponseSchema,
    query: listTicketsQuerySchema.parse(query),
    signal,
  })
}

export function getTicket(id: string, signal?: AbortSignal): Promise<Ticket> {
  return apiRequest(`/tickets/${encodeURIComponent(id)}`, { schema: ticketSchema, signal })
}

export function createTicket(body: CreateTicketBody): Promise<Ticket> {
  return apiRequest('/tickets', {
    method: 'POST',
    body: createTicketBodySchema.parse(body),
    schema: ticketSchema,
  })
}

export function updateTicket(id: string, patch: UpdateTicketBody): Promise<Ticket> {
  return apiRequest(`/tickets/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: updateTicketBodySchema.parse(patch),
    schema: ticketSchema,
  })
}

export function addComment(id: string, body: AddCommentBody): Promise<Ticket> {
  return apiRequest(`/tickets/${encodeURIComponent(id)}/comments`, {
    method: 'POST',
    body: addCommentBodySchema.parse(body),
    schema: ticketSchema,
  })
}

export function deleteTicket(id: string): Promise<DeletedCount> {
  return apiRequest(`/tickets/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    schema: deletedCountSchema,
  })
}

export function bulkUpdateStatus(body: BulkUpdateBody): Promise<UpdatedCount> {
  return apiRequest('/tickets/bulk', {
    method: 'PATCH',
    body: bulkUpdateBodySchema.parse(body),
    schema: updatedCountSchema,
  })
}

export function bulkDeleteTickets(body: BulkDeleteBody): Promise<DeletedCount> {
  return apiRequest('/tickets/bulk', {
    method: 'DELETE',
    body: bulkDeleteBodySchema.parse(body),
    schema: deletedCountSchema,
  })
}
