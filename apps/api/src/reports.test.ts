import { describe, expect, it } from 'vitest'
import {
  apiErrorSchema,
  reportAssigneesResponseSchema,
  reportBreakdownResponseSchema,
  reportSummaryResponseSchema,
  ticketSchema,
  TICKET_STATUSES,
} from '@harness-sample/shared'
import { createApiApp, type ApiAppOptions } from './app'

/**
 * The reporting endpoints, exercised the same way as the ticket routes: through
 * `app.request`, with every response parsed by the contract schema rather than
 * poked at.
 *
 * The ranges below are fixed dates over the seeded queue, which spans
 * 2026-06-02 to 2026-07-31. Nothing here asks for "the last 30 days", because a
 * test whose expectations depend on the day it runs is a test that starts
 * failing on its own.
 */
function createApp(options: ApiAppOptions = {}) {
  return createApiApp({ latencyMs: [0, 0], ...options })
}

/** June holds 19 of the seeded tickets, July the remaining 21. */
const JUNE = { from: '2026-06-01', to: '2026-06-30' } as const
const JULY = { from: '2026-07-01', to: '2026-07-31' } as const

function url(path: string, query: Record<string, string>): string {
  return `${path}?${new URLSearchParams(query).toString()}`
}

async function expectError(response: Response, status: number, code: string): Promise<string[]> {
  expect(response.status).toBe(status)

  const body = apiErrorSchema.parse(await response.json())
  expect(body.error.code).toBe(code)

  return body.error.details ?? []
}

const HOUR_IN_MS = 60 * 60 * 1000

describe('GET /api/reports/summary', () => {
  it('counts the tickets raised in the range and compares them with the period before', async () => {
    const response = await createApp().request(url('/api/reports/summary', JULY))

    expect(response.status).toBe(200)

    const body = reportSummaryResponseSchema.parse(await response.json())

    expect(body.range).toEqual(JULY)
    // The 31 days ending the day before the range starts, and not overlapping it.
    expect(body.previousRange).toEqual({ from: '2026-05-31', to: '2026-06-30' })

    expect(body.totalTickets).toMatchObject({ value: 21, previousValue: 19 })
    expect(body.totalTickets.changeRatio).toBeCloseTo((21 - 19) / 19)

    // Every figure describes the same cohort, so the two halves add up.
    expect(body.resolvedTickets.value).toBe(9)
    expect(body.openTickets.value).toBe(12)
  })

  it('measures time to resolution from the ticket to its last comment', async () => {
    const app = createApp()

    // A range holding exactly one resolved ticket, so the median is that
    // ticket's own resolution time and the rule can be checked rather than
    // restated as a number.
    const range = { from: '2026-07-20', to: '2026-07-22' }
    const body = reportSummaryResponseSchema.parse(
      await (await app.request(url('/api/reports/summary', range))).json(),
    )

    expect(body.totalTickets.value).toBe(2)
    expect(body.resolvedTickets.value).toBe(1)

    const ticket = ticketSchema.parse(await (await app.request('/api/tickets/TCK-0033')).json())
    const lastComment = ticket.comments.at(-1)

    expect(lastComment).toBeDefined()
    expect(body.medianResolutionMs.value).toBe(
      Date.parse(lastComment?.createdAt ?? '') - Date.parse(ticket.createdAt),
    )
  })

  it('reports a median over the whole range, not a total', async () => {
    const body = reportSummaryResponseSchema.parse(
      await (await createApp().request(url('/api/reports/summary', JULY))).json(),
    )

    // Nine tickets resolved in July, each within a few days of being raised.
    expect(body.medianResolutionMs.value).toBeGreaterThan(20 * HOUR_IN_MS)
    expect(body.medianResolutionMs.value).toBeLessThan(70 * HOUR_IN_MS)
  })

  it('reports nothing rather than zero for a range with no tickets in it', async () => {
    const body = reportSummaryResponseSchema.parse(
      await (
        await createApp().request(url('/api/reports/summary', { from: '2026-01-01', to: '2026-01-31' }))
      ).json(),
    )

    expect(body.totalTickets).toEqual({ value: 0, previousValue: 0, changeRatio: null })
    // No ticket resolved is not a resolution time of zero.
    expect(body.medianResolutionMs.value).toBeNull()
    expect(body.medianResolutionMs.changeRatio).toBeNull()
  })

  it('leaves the change empty when the previous period had nothing to grow from', async () => {
    // June is the first month of the queue, so the 30 days before it are empty.
    const body = reportSummaryResponseSchema.parse(
      await (await createApp().request(url('/api/reports/summary', JUNE))).json(),
    )

    expect(body.totalTickets).toMatchObject({ value: 19, previousValue: 0, changeRatio: null })
  })
})

describe('GET /api/reports/breakdown', () => {
  it('breaks the range down by status, keeping the buckets nothing landed in', async () => {
    const response = await createApp().request(
      url('/api/reports/breakdown', { ...JULY, dimension: 'status' }),
    )

    expect(response.status).toBe(200)

    const body = reportBreakdownResponseSchema.parse(await response.json())

    expect(body.dimension).toBe('status')
    expect(body.total).toBe(21)
    expect(body.buckets.map((bucket) => bucket.key)).toEqual([...TICKET_STATUSES])
    expect(body.buckets.map((bucket) => bucket.value)).toEqual([6, 6, 6, 3])

    const summed = body.buckets.reduce((running, bucket) => running + bucket.value, 0)
    expect(summed).toBe(body.total)
  })

  it('breaks the same range down by priority', async () => {
    const body = reportBreakdownResponseSchema.parse(
      await (
        await createApp().request(url('/api/reports/breakdown', { ...JULY, dimension: 'priority' }))
      ).json(),
    )

    expect(body.buckets.map((bucket) => bucket.key)).toEqual(['low', 'medium', 'high'])
    expect(body.buckets.map((bucket) => bucket.value)).toEqual([3, 13, 5])
  })

  it('reports each bucket as a share of the range', async () => {
    const body = reportBreakdownResponseSchema.parse(
      await (
        await createApp().request(url('/api/reports/breakdown', { ...JULY, dimension: 'status' }))
      ).json(),
    )

    expect(body.buckets[0]?.share).toBeCloseTo(6 / 21)
    expect(body.buckets.reduce((running, bucket) => running + bucket.share, 0)).toBeCloseTo(1)
  })

  it('answers an empty range with empty buckets rather than no buckets', async () => {
    const body = reportBreakdownResponseSchema.parse(
      await (
        await createApp().request(
          url('/api/reports/breakdown', { from: '2026-01-01', to: '2026-01-31', dimension: 'status' }),
        )
      ).json(),
    )

    expect(body.total).toBe(0)
    expect(body.buckets).toHaveLength(TICKET_STATUSES.length)
    expect(body.buckets.every((bucket) => bucket.value === 0 && bucket.share === 0)).toBe(true)
  })

  it('rejects a dimension it does not report on', async () => {
    const details = await expectError(
      await createApp().request(url('/api/reports/breakdown', { ...JULY, dimension: 'assignee' })),
      400,
      'validation_failed',
    )

    expect(details.join('\n')).toContain('dimension:')
  })
})

describe('GET /api/reports/assignees', () => {
  it('returns one row per assignee, busiest first', async () => {
    const response = await createApp().request(url('/api/reports/assignees', JULY))

    expect(response.status).toBe(200)

    const body = reportAssigneesResponseSchema.parse(await response.json())

    expect(body.total).toBe(21)
    expect(body.rows.map((row) => row.assignee)).toEqual([
      'Unassigned',
      'Marco Ellis',
      // Four each, so alphabetical decides between these two.
      'Dana Whitfield',
      'Priya Raman',
      'Tomas Lindqvist',
    ])
    expect(body.rows.map((row) => row.total)).toEqual([6, 5, 4, 4, 2])
  })

  it('counts every status for each assignee', async () => {
    const body = reportAssigneesResponseSchema.parse(
      await (await createApp().request(url('/api/reports/assignees', JULY))).json(),
    )

    for (const row of body.rows) {
      const summed = TICKET_STATUSES.reduce((running, status) => running + row.byStatus[status], 0)
      expect(summed).toBe(row.total)
    }

    expect(body.rows.reduce((running, row) => running + row.total, 0)).toBe(body.total)
  })

  it('returns no rows for a range with no tickets in it', async () => {
    const body = reportAssigneesResponseSchema.parse(
      await (
        await createApp().request(url('/api/reports/assignees', { from: '2026-01-01', to: '2026-01-31' }))
      ).json(),
    )

    expect(body).toMatchObject({ total: 0, rows: [] })
  })
})

describe('the range every report endpoint takes', () => {
  it('rejects a range that ends before it starts', async () => {
    const details = await expectError(
      await createApp().request(url('/api/reports/summary', { from: '2026-07-31', to: '2026-07-01' })),
      400,
      'validation_failed',
    )

    expect(details).toEqual(['The range must start on or before it ends.'])
  })

  it('rejects a range longer than a year', async () => {
    const details = await expectError(
      await createApp().request(url('/api/reports/summary', { from: '2024-01-01', to: '2026-07-01' })),
      400,
      'validation_failed',
    )

    expect(details).toEqual(['The range must not be longer than 366 days.'])
  })

  it('rejects a date it cannot read, and names the field', async () => {
    const details = await expectError(
      await createApp().request(url('/api/reports/assignees', { from: 'last-tuesday', to: '2026-07-01' })),
      400,
      'validation_failed',
    )

    expect(details.join('\n')).toContain('from:')
  })

  it('rejects a range that was not given at all', async () => {
    const details = await expectError(
      await createApp().request('/api/reports/summary'),
      400,
      'validation_failed',
    )

    expect(details.map((detail) => detail.split(':')[0])).toEqual(['from', 'to'])
  })
})
