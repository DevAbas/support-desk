import { describe, expect, it } from 'vitest'
import type { CustomerSummary } from '@support-desk/shared'
import { customersCsvFilename, customersToCsv } from '@/features/customers/customersCsv'

function makeCustomer(overrides: Partial<CustomerSummary> = {}): CustomerSummary {
  return {
    id: 'cus-0001',
    name: 'Priya Raman',
    company: 'Northwind Labs',
    email: 'priya.raman@northwindlabs.example',
    avatarUrl: null,
    plan: 'enterprise',
    signupDate: '2025-11-04',
    ticketCount: 8,
    ...overrides,
  }
}

function rows(csv: string): string[] {
  return csv.split('\r\n')
}

describe('customersToCsv', () => {
  it('writes a header row and one row per customer', () => {
    const csv = customersToCsv([makeCustomer(), makeCustomer({ id: 'cus-0002', name: 'Elena Harper' })])

    expect(rows(csv)).toEqual([
      '"Name","Company","Email","Plan","Tickets","Signed up"',
      '"Priya Raman","Northwind Labs","priya.raman@northwindlabs.example","Enterprise","8","2025-11-04"',
      '"Elena Harper","Northwind Labs","priya.raman@northwindlabs.example","Enterprise","8","2025-11-04"',
    ])
  })

  it('writes the header alone when there is nothing to export', () => {
    expect(customersToCsv([])).toBe('"Name","Company","Email","Plan","Tickets","Signed up"')
  })

  it('uses the plan label rather than the raw domain value', () => {
    expect(rows(customersToCsv([makeCustomer({ plan: 'starter' })]))[1]).toContain('"Starter"')
  })

  it('writes the signup date as an ISO date a spreadsheet can sort', () => {
    expect(rows(customersToCsv([makeCustomer()]))[1]).toContain('"2025-11-04"')
  })

  it('escapes quotes and commas in a company name', () => {
    const csv = customersToCsv([makeCustomer({ company: 'Harper, Okafor & "Co"' })])

    expect(rows(csv)).toHaveLength(2)
    expect(csv).toContain('"Harper, Okafor & ""Co"""')
  })

  it('neutralises a name a spreadsheet would read as a formula', () => {
    expect(rows(customersToCsv([makeCustomer({ name: '=1+1' })]))[1]).toContain('"\'=1+1"')
  })
})

describe('customersCsvFilename', () => {
  it('stamps the file with the date', () => {
    expect(customersCsvFilename(new Date('2026-08-29T10:00:00.000Z'))).toBe('customers-2026-08-29.csv')
  })
})
