import { describe, expect, it } from 'vitest'
import { DEFAULT_TAXONOMY, type Ticket } from '@harness-sample/shared'
import { ticketsCsvFilename, ticketsToCsv } from '@/features/tickets/ticketsCsv'

/** The labels the export writes. The screen passes in whatever the admin configured. */
const labels = {
  statuses: DEFAULT_TAXONOMY.statuses,
  priorities: DEFAULT_TAXONOMY.priorities,
}

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 'TCK-0001',
    title: 'Login page returns a 500',
    description: 'Irrelevant to the export.',
    status: 'open',
    priority: 'high',
    assignee: 'Dana Cole',
    createdAt: '2026-03-05T09:15:00.000Z',
    comments: [],
    ...overrides,
  }
}

function rows(csv: string): string[] {
  return csv.split('\r\n')
}

describe('ticketsToCsv', () => {
  it('writes a header row and one row per ticket', () => {
    const csv = ticketsToCsv([makeTicket(), makeTicket({ id: 'TCK-0002' })], labels)

    expect(rows(csv)).toEqual([
      '"Ticket","Title","Status","Priority","Assignee","Created"',
      '"TCK-0001","Login page returns a 500","Open","High","Dana Cole","2026-03-05T09:15:00.000Z"',
      '"TCK-0002","Login page returns a 500","Open","High","Dana Cole","2026-03-05T09:15:00.000Z"',
    ])
  })

  it('writes the header alone when there is nothing to export', () => {
    expect(ticketsToCsv([], labels)).toBe('"Ticket","Title","Status","Priority","Assignee","Created"')
  })

  it('uses the configured labels rather than the raw values', () => {
    const csv = ticketsToCsv([makeTicket({ status: 'pending', priority: 'medium' })], labels)

    expect(rows(csv)[1]).toContain('"Pending","Medium"')
  })

  it('writes a value the taxonomy no longer has as itself', () => {
    const csv = ticketsToCsv([makeTicket({ status: 'escalated' })], labels)

    expect(rows(csv)[1]).toContain('"escalated","High"')
  })

  it('escapes quotes, commas and newlines in a title', () => {
    const csv = ticketsToCsv([makeTicket({ title: 'He said "hi", then\nleft' })], labels)

    // The newline stays inside the quoted field: still a header and one record.
    expect(rows(csv)).toHaveLength(2)
    expect(csv).toContain('"He said ""hi"", then\nleft"')
  })

  it('neutralises a title a spreadsheet would read as a formula', () => {
    const csv = ticketsToCsv([makeTicket({ title: '=1+1' })], labels)

    expect(rows(csv)[1]).toContain('"\'=1+1"')
  })
})

describe('ticketsCsvFilename', () => {
  it('stamps the file with the date', () => {
    expect(ticketsCsvFilename(new Date('2026-08-22T10:00:00.000Z'))).toBe('tickets-2026-08-22.csv')
  })
})
