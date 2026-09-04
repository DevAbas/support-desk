import {
  addCommentBodySchema,
  bulkDeleteBodySchema,
  bulkTicketMoveBodySchema,
  bulkTicketMoveResponseSchema,
  createTicketBodySchema,
  deletedCountSchema,
  listTicketsQuerySchema,
  listTicketsResponseSchema,
  ticketMoveBodySchema,
  ticketMoveOffersResponseSchema,
  ticketSchema,
  updateTicketBodySchema,
  type AddCommentBody,
  type BulkDeleteBody,
  type BulkTicketMoveBody,
  type BulkTicketMoveResponse,
  type CreateTicketBody,
  type DeletedCount,
  type ListTicketsQuery,
  type ListTicketsResponse,
  type Ticket,
  type TicketMoveBody,
  type TicketMoveOffersResponse,
  type UpdateTicketBody,
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

/**
 * What this role may do to this ticket right now.
 *
 * Asked rather than worked out. The workflow is shared code and the screen
 * could read it, but availability turns on ticket state the cache may be a
 * moment behind on and on a role rule that must not have a second
 * implementation in the browser — so the server answers, and the screen draws
 * the answer. What the screen still reads out of the shared tables is each
 * move's label and whether committing it asks for a reason, which is
 * presentation and never was the server's to send.
 */
export function listTicketMoves(
  id: string,
  signal?: AbortSignal,
): Promise<TicketMoveOffersResponse> {
  return apiRequest(`/tickets/${encodeURIComponent(id)}/moves`, {
    schema: ticketMoveOffersResponseSchema,
    signal,
  })
}

/** Answers with the whole moved ticket, history included. */
export function moveTicket(id: string, body: TicketMoveBody): Promise<Ticket> {
  return apiRequest(`/tickets/${encodeURIComponent(id)}/moves`, {
    method: 'POST',
    body: ticketMoveBodySchema.parse(body),
    schema: ticketSchema,
  })
}

export function bulkMoveTickets(body: BulkTicketMoveBody): Promise<BulkTicketMoveResponse> {
  return apiRequest('/tickets/bulk/moves', {
    method: 'POST',
    body: bulkTicketMoveBodySchema.parse(body),
    schema: bulkTicketMoveResponseSchema,
  })
}

export function bulkDeleteTickets(body: BulkDeleteBody): Promise<DeletedCount> {
  return apiRequest('/tickets/bulk', {
    method: 'DELETE',
    body: bulkDeleteBodySchema.parse(body),
    schema: deletedCountSchema,
  })
}
