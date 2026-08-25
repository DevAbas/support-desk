import { z } from 'zod'
import {
  MAX_TAXONOMY_ENTRIES,
  MAX_TAXONOMY_LABEL_LENGTH,
  MAX_TAXONOMY_VALUE_LENGTH,
  MIN_TAXONOMY_ENTRIES,
  RESERVED_TAXONOMY_VALUES,
  ROLES,
  TAXONOMY_VALUE_PATTERN,
  TICKET_APPEARANCES,
  type Taxonomy,
  type TaxonomyEntry,
  type TaxonomyUsage,
  type Ticket,
  type TicketComment,
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

/**
 * A status or priority value.
 *
 * This is a shape check, not a membership check: which values exist is in the
 * taxonomy an admin edits, and this file is static — it is imported by both ends
 * and cannot know what the store currently holds. The routes that write a status
 * or a priority check membership against the live taxonomy and answer with the
 * same `validation_failed` shape, so a value that parses here can still be
 * rejected there.
 */
export const taxonomyValueSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_TAXONOMY_VALUE_LENGTH)
  .regex(TAXONOMY_VALUE_PATTERN, 'Use lowercase letters, digits and hyphens.')

export const ticketStatusSchema = taxonomyValueSchema

export const ticketPrioritySchema = taxonomyValueSchema

export const roleSchema = z.enum(ROLES)

/**
 * `all` is the widening the list screen uses for "do not filter on this". It is
 * a valid value shape, so it needs no special case here.
 *
 * Membership is deliberately not checked on a filter. A saved view can outlive
 * the status it was built on, and answering that with an empty list is kinder
 * than answering with a 400 the screen would have to explain.
 */
export const statusFilterSchema = taxonomyValueSchema

export const priorityFilterSchema = taxonomyValueSchema

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
 * The editable statuses and priorities.
 *
 * Annotated with the domain types for the same reason `ticketSchema` is: a field
 * added to `TaxonomyEntry` without being added here is a compile error rather
 * than a field the client silently strips.
 */
const taxonomyEntryValueSchema = taxonomyValueSchema.refine(
  (value) => !RESERVED_TAXONOMY_VALUES.some((reserved) => reserved === value),
  { message: `Cannot be one of ${RESERVED_TAXONOMY_VALUES.join(', ')}.` },
)

export const taxonomyEntrySchema: z.ZodType<TaxonomyEntry> = z.object({
  value: taxonomyEntryValueSchema,
  label: z.string().trim().min(1).max(MAX_TAXONOMY_LABEL_LENGTH),
  appearance: z.enum(TICKET_APPEARANCES),
})

/**
 * One set, in display order.
 *
 * The lower bound is what stops a ticket being left with nothing to hold, and
 * the uniqueness check is what stops two entries answering to the same value —
 * which would make a filter ambiguous and a migration undecidable.
 */
const taxonomyEntryListSchema = z
  .array(taxonomyEntrySchema)
  .min(MIN_TAXONOMY_ENTRIES)
  .max(MAX_TAXONOMY_ENTRIES)
  .refine(
    (entries) => new Set(entries.map((entry) => entry.value)).size === entries.length,
    { message: 'Each value can only appear once.' },
  )

export const taxonomySchema: z.ZodType<Taxonomy> = z.object({
  statuses: taxonomyEntryListSchema,
  priorities: taxonomyEntryListSchema,
})

export const taxonomyUsageSchema: z.ZodType<TaxonomyUsage> = z.object({
  statuses: z.record(z.string(), z.number().int().nonnegative()),
  priorities: z.record(z.string(), z.number().int().nonnegative()),
})

/** The taxonomy plus how many tickets hold each value, which is what the editor shows. */
export const taxonomyResponseSchema = z.object({
  taxonomy: taxonomySchema,
  usage: taxonomyUsageSchema,
})

export type TaxonomyResponse = z.infer<typeof taxonomyResponseSchema>

/**
 * Where the tickets holding a removed value should be moved, keyed by the value
 * being removed. Removing a value nothing holds needs no entry; removing one
 * that tickets do hold without an entry here is a validation failure, because
 * the alternative is a ticket left pointing at a status that no longer exists.
 */
export const taxonomyReassignSchema = z.object({
  statuses: z.record(z.string(), taxonomyValueSchema).default({}),
  priorities: z.record(z.string(), taxonomyValueSchema).default({}),
})

export type TaxonomyReassign = z.infer<typeof taxonomyReassignSchema>

/** A whole-set replacement rather than a patch: order is part of what is being edited. */
export const updateTaxonomyBodySchema = z.object({
  taxonomy: taxonomySchema,
  reassign: taxonomyReassignSchema.default({ statuses: {}, priorities: {} }),
})

export type UpdateTaxonomyBody = z.input<typeof updateTaxonomyBodySchema>

export const updateTaxonomyResponseSchema = taxonomyResponseSchema.extend({
  /** How many tickets were moved onto a different value by this edit. */
  migrated: z.number().int().nonnegative(),
})

export type UpdateTaxonomyResponse = z.infer<typeof updateTaxonomyResponseSchema>

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
