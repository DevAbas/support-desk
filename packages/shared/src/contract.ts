import { z } from 'zod'
import {
  ROLES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  TICKET_TRANSITION_IDS,
  type Ticket,
  type TicketComment,
  type TicketMove,
} from './types'

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

/**
 * The named moves, on the wire.
 *
 * It is here rather than in `workflow.ts` beside the workflow itself for the
 * same reason `ticketStatusSchema` is here: a ticket carries its history, so the
 * ticket schema needs this one, and a contract that imported the workflow while
 * the workflow imported the contract would be a cycle. The wire enum for a
 * domain union lives with the other wire enums; what the moves connect lives
 * with the workflow.
 */
export const ticketTransitionIdSchema = z.enum(TICKET_TRANSITION_IDS)

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

export const ticketMoveSchema: z.ZodType<TicketMove> = z.object({
  id: z.string(),
  transition: ticketTransitionIdSchema,
  from: ticketStatusSchema,
  to: ticketStatusSchema,
  by: z.string(),
  reason: z.string().nullable(),
  at: z.iso.datetime(),
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
  history: z.array(ticketMoveSchema),
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

/**
 * A patch. Every field is optional, but an empty patch is not a valid request.
 *
 * **There is no `status` here, and that is the point of the workflow.** A status
 * is a position rather than a field, so it is reached by making a named move —
 * `POST /api/tickets/:id/moves`, in `workflow.ts` — and not by writing a value
 * over the one that is there. Leaving a second door open that set it directly
 * would make every condition in the workflow a suggestion.
 */
export const updateTicketBodySchema = z
  .object({
    priority: ticketPrioritySchema.optional(),
    assignee: z.string().trim().min(1).max(120).optional(),
  })
  .refine((patch) => Object.values(patch).some((value) => value !== undefined), {
    message: 'Provide at least one of priority or assignee.',
  })

export type UpdateTicketBody = z.infer<typeof updateTicketBodySchema>

export const addCommentBodySchema = z.object({
  author: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(5000),
})

export type AddCommentBody = z.infer<typeof addCommentBodySchema>

/** Exported so `workflow.ts` extends the same bound rather than restating it. */
export const bulkTicketIdsSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(MAX_PAGE_SIZE),
})

export const bulkDeleteBodySchema = bulkTicketIdsSchema

export type BulkDeleteBody = z.infer<typeof bulkDeleteBodySchema>

export const updatedCountSchema = z.object({ updated: z.number().int().nonnegative() })

export type UpdatedCount = z.infer<typeof updatedCountSchema>

export const deletedCountSchema = z.object({ deleted: z.number().int().nonnegative() })

export type DeletedCount = z.infer<typeof deletedCountSchema>

/**
 * Every failure the server reports shares this shape, so the client has one
 * thing to parse and one thing to render.
 *
 * The list is closed, and `apiErrorSchema` is what both ends parse with, so a
 * route answering with a code that is not here fails the contract rather than
 * quietly arriving as something the client cannot name. The four authentication
 * codes were added when there was a session to refuse: `unauthorized` is "the
 * server does not know who you are", `forbidden` is "it does, and the answer is
 * still no".
 */
export const API_ERROR_CODES = [
  'validation_failed',
  'unauthorized',
  'forbidden',
  'not_found',
  'conflict',
  'rate_limited',
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
