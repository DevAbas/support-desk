import { z } from 'zod'
import {
  ROLES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type Ticket,
  type TicketComment,
} from '../types'

/**
 * The wire contract, shared by both ends of it.
 *
 * The server under `server/` validates every request against the schemas below,
 * and the client parses every response with them. One definition means the two
 * sides cannot drift: a field renamed here fails to compile on both.
 *
 * Nothing in this file may import from `features/` — the contract is domain
 * vocabulary, not screen behaviour.
 */

export const ticketStatusSchema = z.enum(TICKET_STATUSES)

export const ticketPrioritySchema = z.enum(TICKET_PRIORITIES)

export const roleSchema = z.enum(ROLES)

/** `all` is the widening the list screen uses for "do not filter on this". */
export const statusFilterSchema = z.enum([...TICKET_STATUSES, 'all'] as const)

export const priorityFilterSchema = z.enum([...TICKET_PRIORITIES, 'all'] as const)

/**
 * Annotated with the domain type rather than left to inference, so that adding a
 * field to `Ticket` without adding it here is a compile error rather than a
 * response the client silently strips.
 */
export const ticketCommentSchema: z.ZodType<TicketComment> = z.object({
  id: z.string(),
  author: z.string(),
  body: z.string(),
  createdAt: z.iso.datetime(),
})

export const ticketSchema: z.ZodType<Ticket> = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: ticketStatusSchema,
  priority: ticketPrioritySchema,
  assignee: z.string(),
  createdAt: z.iso.datetime(),
  comments: z.array(ticketCommentSchema),
})

/**
 * The largest page the list endpoint will serve. The CSV export asks for one
 * page big enough to hold everything the filters match, and this is the ceiling
 * on how much that can be.
 */
export const MAX_PAGE_SIZE = 500

export const DEFAULT_PAGE_SIZE = 10

/**
 * Query strings arrive as strings, so the numbers are coerced. The defaults are
 * applied server-side too, which is why the inferred type has no optional
 * fields: a parsed query is always complete.
 */
export const listTicketsQuerySchema = z.object({
  status: statusFilterSchema.default('all'),
  priority: priorityFilterSchema.default('all'),
  search: z.string().max(200).default(''),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
})

export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>

export const listTicketsResponseSchema = z.object({
  rows: z.array(ticketSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().min(1),
  pageCount: z.number().int().min(1),
})

export type ListTicketsResponse = z.infer<typeof listTicketsResponseSchema>

export const createTicketBodySchema = z.object({
  title: z.string().trim().min(5).max(200),
  description: z.string().trim().min(1).max(5000),
  priority: ticketPrioritySchema,
  assignee: z.string().trim().min(1).max(120),
})

export type CreateTicketBody = z.infer<typeof createTicketBodySchema>

/** A patch. Every field is optional, but an empty patch is not a valid request. */
export const updateTicketBodySchema = z
  .object({
    status: ticketStatusSchema.optional(),
    priority: ticketPrioritySchema.optional(),
    assignee: z.string().trim().min(1).max(120).optional(),
  })
  .refine((patch) => Object.values(patch).some((value) => value !== undefined), {
    message: 'Provide at least one of status, priority or assignee.',
  })

export type UpdateTicketBody = z.infer<typeof updateTicketBodySchema>

export const addCommentBodySchema = z.object({
  author: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(5000),
})

export type AddCommentBody = z.infer<typeof addCommentBodySchema>

const bulkIdsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(MAX_PAGE_SIZE),
})

export const bulkUpdateBodySchema = bulkIdsSchema.extend({ status: ticketStatusSchema })

export type BulkUpdateBody = z.infer<typeof bulkUpdateBodySchema>

export const bulkDeleteBodySchema = bulkIdsSchema

export type BulkDeleteBody = z.infer<typeof bulkDeleteBodySchema>

export const updatedCountSchema = z.object({ updated: z.number().int().nonnegative() })

export type UpdatedCount = z.infer<typeof updatedCountSchema>

export const deletedCountSchema = z.object({ deleted: z.number().int().nonnegative() })

export type DeletedCount = z.infer<typeof deletedCountSchema>

export const meResponseSchema = z.object({ role: roleSchema })

export type MeResponse = z.infer<typeof meResponseSchema>

/**
 * Every failure the server reports shares this shape, so the client has one
 * thing to parse and one thing to render.
 */
export const API_ERROR_CODES = [
  'validation_failed',
  'not_found',
  'forced_failure',
  'server_error',
] as const

export type ApiErrorCode = (typeof API_ERROR_CODES)[number]

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.enum(API_ERROR_CODES),
    message: z.string(),
    /** One entry per failed field, e.g. `title: Too small: expected …`. */
    details: z.array(z.string()).optional(),
  }),
})

export type ApiErrorBody = z.infer<typeof apiErrorSchema>
