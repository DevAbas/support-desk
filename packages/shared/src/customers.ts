import { z } from 'zod'
import { ticketPrioritySchema, ticketStatusSchema } from './contract'
import {
  CUSTOMER_PLANS,
  type Customer,
  type CustomerPlan,
  type CustomerSummary,
  type CustomerTicketRef,
} from './types'

/**
 * The customer contract, shared by both ends of it.
 *
 * A customer is domain vocabulary the same way a ticket is, so the shapes
 * themselves live in `types.ts`. The wire lives here rather than in
 * `contract.ts` for the same reason `reports.ts` does: that file is already the
 * ticket contract, and appending every new endpoint to it would eventually make
 * it the contract for everything.
 *
 * Two things here are deliberately unlike the ticket contract, because the
 * screen reading them is:
 *
 * **The list is a cursor, not a page number.** A dense list is scrolled through
 * rather than paged, and `page=3` is the wrong question to ask of something you
 * are appending to. See `customerCursorSchema`.
 *
 * **The plan filter is a set, not a value.** `status=all` widens a single-value
 * filter; a set needs no widening, because the empty set already means "do not
 * filter on this".
 */

export const customerPlanSchema = z.enum(CUSTOMER_PLANS)

export const customerTicketRefSchema: z.ZodType<CustomerTicketRef> = z.object({
  id: z.string(),
  title: z.string(),
  status: ticketStatusSchema,
  priority: ticketPrioritySchema,
  createdAt: z.iso.datetime(),
})

/**
 * Spread into both customer schemas below rather than extended from one, so
 * that annotating each with its domain type — which is what makes a missing
 * field a compile error — does not cost the other its fields.
 */
const customerSummaryShape = {
  id: z.string(),
  name: z.string(),
  company: z.string(),
  email: z.email(),
  avatarUrl: z.string().nullable(),
  plan: customerPlanSchema,
  signupDate: z.iso.date(),
  ticketCount: z.number().int().nonnegative(),
}

export const customerSummarySchema: z.ZodType<CustomerSummary> = z.object(customerSummaryShape)

export const customerSchema: z.ZodType<Customer> = z.object({
  ...customerSummaryShape,
  tickets: z.array(customerTicketRefSchema),
})

export const DEFAULT_CUSTOMER_PAGE_SIZE = 20

export const MAX_CUSTOMER_PAGE_SIZE = 100

/**
 * Where the last page stopped, as `signupDate|id`.
 *
 * It is the sort key of the last row served, not an offset, which is what makes
 * it survive the list changing underneath it: "everything after this position"
 * still names the same place when the row itself is gone, where "skip the first
 * forty" would quietly repeat or skip a row instead.
 *
 * The client treats it as opaque — it hands back whatever `nextCursor` it was
 * given — but the server still validates it, because an opaque string arriving
 * from a URL bar is a string like any other.
 */
export const customerCursorSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}\|[A-Za-z0-9-]{1,40}$/, 'Must be a cursor this endpoint issued.')

/**
 * Plans travel comma-joined — `plans=pro,enterprise` — so that a filter with
 * several values is still one query parameter, one cache key and one string.
 *
 * The preprocess step accepts either form: a string off the wire, or the array
 * the client already holds, so both ends parse with this and neither has to
 * know which side it is on. The result is put back into domain order, so
 * choosing Pro then Free and choosing Free then Pro are one cached question
 * rather than two.
 */
const planFilterSchema = z
  .preprocess(
    (value) => (typeof value === 'string' ? value.split(',').filter((plan) => plan !== '') : value),
    z.array(customerPlanSchema).max(CUSTOMER_PLANS.length),
  )
  .default([])
  .transform((plans): CustomerPlan[] => CUSTOMER_PLANS.filter((plan) => plans.includes(plan)))

/**
 * Unlike `listTicketsQuerySchema`, one field here is genuinely optional: there
 * is no cursor for the first page, and inventing one — a sentinel, an empty
 * string — would mean a value the regex above has to make an exception for.
 */
export const listCustomersQuerySchema = z.object({
  plans: planFilterSchema,
  search: z.string().max(200).default(''),
  cursor: customerCursorSchema.optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_CUSTOMER_PAGE_SIZE)
    .default(DEFAULT_CUSTOMER_PAGE_SIZE),
})

export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>

/**
 * The query without its cursor: the question, separate from where in the answer
 * you have read to. This is what a cache key is built from — the pages of one
 * infinite list all belong to the same question, and folding the cursor into the
 * key would file every page under a question of its own.
 */
export type ListCustomersFilters = Omit<ListCustomersQuery, 'cursor'>

export const listCustomersResponseSchema = z.object({
  rows: z.array(customerSummarySchema),
  /** Null once the last row has been served: there is no next page to ask for. */
  nextCursor: customerCursorSchema.nullable(),
  /** Every customer the filters match, not only the ones served so far. */
  total: z.number().int().nonnegative(),
})

export type ListCustomersResponse = z.infer<typeof listCustomersResponseSchema>
