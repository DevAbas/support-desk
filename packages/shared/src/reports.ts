import { z } from 'zod'
import { ticketStatusSchema } from './contract'
import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type TicketPriority,
  type TicketStatus,
} from './types'

/**
 * The reporting contract, shared by both ends of it.
 *
 * Reports are a read model over the ticket queue, not a new part of the domain
 * vocabulary: there is no `Report` the way there is a `Ticket`. That is why the
 * shapes below live in their own file rather than in `types.ts` — every one of
 * them exists only because an endpoint returns it.
 *
 * The aggregation itself is the server's job. Nothing here describes a list of
 * tickets for the client to count: the figures arrive already counted.
 */

/**
 * A closed date range, both ends inclusive, as calendar dates rather than
 * instants.
 *
 * Dates are read in UTC at both ends — `from` from the start of its day, `to`
 * to the end of its own — so a range means the same thing wherever the person
 * reading it happens to be. A date-only string is also what `<input type="date">`
 * emits and what a cache key wants: two of them compare as strings.
 */
export const reportRangeSchema = z.object({
  from: z.iso.date(),
  to: z.iso.date(),
})

export type ReportRange = z.infer<typeof reportRangeSchema>

/** The widest span the endpoints will aggregate over. */
export const MAX_REPORT_RANGE_DAYS = 366

const DAY_IN_MS = 24 * 60 * 60 * 1000

/** ISO dates sort chronologically as strings, so this is the whole comparison. */
function isOrderedRange(range: ReportRange): boolean {
  return range.from <= range.to
}

function isWithinMaxSpan(range: ReportRange): boolean {
  return (Date.parse(range.to) - Date.parse(range.from)) / DAY_IN_MS <= MAX_REPORT_RANGE_DAYS
}

/**
 * Applied to every report query, so an impossible range is a 400 naming the
 * problem rather than an empty chart the reader has to explain to themselves.
 */
function refineRange<TSchema extends z.ZodType<ReportRange>>(schema: TSchema) {
  return schema
    .refine(isOrderedRange, { message: 'The range must start on or before it ends.' })
    .refine(isWithinMaxSpan, {
      message: `The range must not be longer than ${String(MAX_REPORT_RANGE_DAYS)} days.`,
    })
}

export const reportRangeQuerySchema = refineRange(reportRangeSchema)

export type ReportRangeQuery = z.infer<typeof reportRangeQuerySchema>

/** The two ways the breakdown endpoint can slice the range. */
export const REPORT_DIMENSIONS = ['status', 'priority'] as const

export type ReportDimension = (typeof REPORT_DIMENSIONS)[number]

export const reportDimensionSchema = z.enum(REPORT_DIMENSIONS)

export const reportBreakdownQuerySchema = refineRange(
  reportRangeSchema.extend({ dimension: reportDimensionSchema }),
)

export type ReportBreakdownQuery = z.infer<typeof reportBreakdownQuerySchema>

/**
 * One figure, alongside the same figure over the previous equivalent period.
 *
 * `value` is nullable because not every figure exists for every range: a range
 * in which nothing was resolved has no median time to resolution, and reporting
 * that as `0` would read as "resolved instantly". `changeRatio` is the
 * fractional change against `previousValue`, and is null whenever there is
 * nothing to divide by — a period that starts from zero has no percentage
 * growth, however much it gained.
 */
export const reportMetricSchema = z.object({
  value: z.number().nullable(),
  previousValue: z.number().nullable(),
  changeRatio: z.number().nullable(),
})

export type ReportMetric = z.infer<typeof reportMetricSchema>

export const reportSummaryResponseSchema = z.object({
  /** Echoed back so the screen reports the range the server actually used. */
  range: reportRangeSchema,
  /** The equally long span ending the day before `range` starts. */
  previousRange: reportRangeSchema,
  totalTickets: reportMetricSchema,
  resolvedTickets: reportMetricSchema,
  /** Milliseconds. Null when nothing in the range has been resolved. */
  medianResolutionMs: reportMetricSchema,
  openTickets: reportMetricSchema,
})

export type ReportSummaryResponse = z.infer<typeof reportSummaryResponseSchema>

/**
 * A bucket key is a ticket status or a ticket priority, depending on the
 * dimension asked for. The two unions are disjoint, so one type covers both and
 * the client can still map every key it might be handed. Built from the domain
 * unions rather than listed again, so a new status cannot go missing here.
 */
export const reportBucketKeySchema = z.enum([...TICKET_STATUSES, ...TICKET_PRIORITIES] as const)

export type ReportBucketKey = TicketStatus | TicketPriority

/**
 * Buckets carry no label. What "resolved" is called on screen is presentation,
 * and both ends already share `TICKET_STATUS_LABELS` — sending it over the wire
 * would be a second place for it to be wrong.
 */
export const reportBucketSchema = z.object({
  key: reportBucketKeySchema,
  value: z.number().int().nonnegative(),
  /** The bucket's share of the range, 0–1. Computed here so nobody divides twice. */
  share: z.number().min(0).max(1),
})

export type ReportBucket = z.infer<typeof reportBucketSchema>

export const reportBreakdownResponseSchema = z.object({
  range: reportRangeSchema,
  dimension: reportDimensionSchema,
  total: z.number().int().nonnegative(),
  /** Every bucket of the dimension, in domain order, including empty ones. */
  buckets: z.array(reportBucketSchema),
})

export type ReportBreakdownResponse = z.infer<typeof reportBreakdownResponseSchema>

/**
 * Annotated with the record type rather than left to inference, so a status
 * added to the domain is a compile error here rather than a column that
 * quietly stops being counted.
 */
export const reportStatusCountsSchema: z.ZodType<Record<TicketStatus, number>> = z.record(
  ticketStatusSchema,
  z.number().int().nonnegative(),
)

export const reportAssigneeRowSchema = z.object({
  assignee: z.string(),
  total: z.number().int().nonnegative(),
  byStatus: reportStatusCountsSchema,
})

export type ReportAssigneeRow = z.infer<typeof reportAssigneeRowSchema>

export const reportAssigneesResponseSchema = z.object({
  range: reportRangeSchema,
  total: z.number().int().nonnegative(),
  /** Busiest first, then alphabetically, so the order is stable between loads. */
  rows: z.array(reportAssigneeRowSchema),
})

export type ReportAssigneesResponse = z.infer<typeof reportAssigneesResponseSchema>
