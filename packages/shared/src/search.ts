import { z } from 'zod'
import { ticketPrioritySchema, ticketStatusSchema } from './contract'
import { customerPlanSchema } from './customers'
import { navigationTargetIdSchema } from './navigation'

/**
 * The global search contract, shared by both ends of it.
 *
 * It has an endpoint of its own rather than fanning out across the two list
 * endpoints, and the reasons are all things a client would otherwise have to
 * hold:
 *
 * - **It asks a different question of the queue.** `listTicketsQuerySchema`
 *   searches a ticket's title and its id, because that is what the filter above
 *   a table of tickets is for. Global search also has to find the ticket
 *   somebody mentioned by who it is on, and widening the list endpoint to do
 *   that would change what the ticket screen's own filter means.
 * - **The ordering is the answer, not the client's arrangement of it.** Which
 *   groups come back, in what order, and how many of each is one decision, and
 *   it is made once, here.
 * - **The role gate is server-side.** Two list requests plus a locally filtered
 *   nav is three places for "an agent cannot see this" to be true, and one of
 *   them is in the browser.
 * - **One request is one debounce, one cache key, one loading state and one
 *   abort.** Three would be four states a palette has to reconcile mid-keystroke.
 *
 * Nothing on the wire is presentation. A result carries what was found; the
 * badge it is drawn with, the words above its group and where selecting it goes
 * are the feature layer's, the same way a `BadgeStatus` is.
 */

/**
 * The groups, in the order they come back — and that order is the decision.
 *
 * **Tickets, then customers, then screens.** The queue is what an agent has open
 * all day and the thing most often reached for by name, so it is nearest the
 * top. A customer is the second question and usually the one asked *from* a
 * ticket. The screens come last because they are the smallest and most
 * predictable set, every one of them is already one click away in the header,
 * and they are the group most likely to match a short query — putting them first
 * would push the ticket somebody is actually looking for below the fold.
 *
 * The order is fixed rather than scored. A group order that moves with the query
 * moves the row under the cursor with it, and "down, down, enter" is worth more
 * than a marginally better first result.
 */
export const SEARCH_RESULT_TYPES = ['ticket', 'customer', 'navigation'] as const

export type SearchResultType = (typeof SEARCH_RESULT_TYPES)[number]

export const searchTicketResultSchema = z.object({
  type: z.literal('ticket'),
  id: z.string(),
  title: z.string(),
  assignee: z.string(),
  status: ticketStatusSchema,
  priority: ticketPrioritySchema,
})

/**
 * A customer as a search result: what a row needs and nothing else.
 *
 * Not a `CustomerSummary`. `ticketCount` and `signupDate` are what the customer
 * *list* draws, and a palette that carried them would be asking the queue to be
 * counted for a line nobody reads.
 */
export const searchCustomerResultSchema = z.object({
  type: z.literal('customer'),
  id: z.string(),
  name: z.string(),
  company: z.string(),
  email: z.email(),
  avatarUrl: z.string().nullable(),
  plan: customerPlanSchema,
})

/**
 * A screen.
 *
 * It carries its `path` rather than leaving the client to look one up by id: a
 * result exists to be acted on, and a lookup that can miss is a result that can
 * arrive with nowhere to go. Both ends read the same `NAVIGATION_TARGETS`, so
 * the path on the wire is a copy of the one decision rather than a second one.
 */
export const searchNavigationResultSchema = z.object({
  type: z.literal('navigation'),
  id: navigationTargetIdSchema,
  label: z.string(),
  description: z.string(),
  path: z.string(),
})

export const searchResultSchema = z.discriminatedUnion('type', [
  searchTicketResultSchema,
  searchCustomerResultSchema,
  searchNavigationResultSchema,
])

export type SearchResult = z.infer<typeof searchResultSchema>

export const searchGroupSchema = z.object({
  type: z.enum(SEARCH_RESULT_TYPES),
  /**
   * Everything that matched, not only what was served.
   *
   * A palette shows a handful on purpose, and the difference between "these
   * five" and "five of forty" is the difference between an answer and a reason
   * to type another word.
   */
  total: z.number().int().nonnegative(),
  results: z.array(searchResultSchema),
})

export type SearchGroup = z.infer<typeof searchGroupSchema>

/**
 * How many results a group serves.
 *
 * Five, because a palette is for reaching one thing: if what you want is not in
 * the first five of its kind, the query is too vague and another word is faster
 * than a scroll. It is also what keeps every group visible at once without the
 * panel scrolling on a typical query.
 */
export const DEFAULT_SEARCH_LIMIT = 5

export const MAX_SEARCH_LIMIT = 20

export const searchQuerySchema = z.object({
  /**
   * Bounded like every other search term in this contract. An empty one is
   * valid and answers with nothing: "what matches nothing at all" has an answer,
   * and it is not an error.
   */
  q: z.string().max(200).default(''),
  /** Per group, not in total: the groups are answers to different questions. */
  limit: z.coerce.number().int().min(1).max(MAX_SEARCH_LIMIT).default(DEFAULT_SEARCH_LIMIT),
})

export type SearchQuery = z.infer<typeof searchQuerySchema>

/**
 * Only the groups that found something.
 *
 * An empty group is a heading over nothing, and the client would have to filter
 * them out to avoid drawing one — so the response does it once instead of every
 * caller doing it again.
 */
export const searchResponseSchema = z.object({ groups: z.array(searchGroupSchema) })

export type SearchResponse = z.infer<typeof searchResponseSchema>
