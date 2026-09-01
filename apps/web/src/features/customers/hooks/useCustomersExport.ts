import { useState } from 'react'
import {
  MAX_CUSTOMER_PAGE_SIZE,
  type CustomerSummary,
  type ListCustomersFilters,
} from '@support-desk/shared'
import { listCustomers } from '@/lib/api/customers'
import { toErrorMessage } from '@/lib/api/http'
import { downloadTextFile } from '@/lib/download'
import {
  CUSTOMERS_CSV_MIME_TYPE,
  customersCsvFilename,
  customersToCsv,
} from '@/features/customers/customersCsv'

interface UseCustomersExportResult {
  exportCsv: () => Promise<void>
  isExporting: boolean
  error: string | null
}

/**
 * Exports every customer the filters match, not just the pages loaded so far, so
 * the file means the same thing whether it was taken before or after pressing
 * load-more.
 *
 * It walks the cursor rather than asking for one page big enough to hold
 * everything, which is where this parts company with `useTicketsExport`. That
 * endpoint serves up to five hundred rows in a page and the queue is smaller
 * than one; this one caps a page at a hundred, and a customer list is the thing
 * in this app expected to outgrow that. Asking for one oversized page would mean
 * an export that quietly stopped at the hundredth customer — and stopped
 * silently, because a truncated CSV looks exactly like a complete one.
 *
 * The walk goes straight to `listCustomers` rather than through `fetchQuery`.
 * `customerKeys.list` deliberately holds no cursor — the pages of the list on
 * screen are one question under one key — so caching this walk would mean
 * inventing a second, contradictory key scheme for pages nobody navigates back
 * to. An export is a snapshot taken now, and reads like one.
 */

/**
 * A stop on the walk, so a server that keeps handing back a cursor cannot spin
 * this forever. It is a runaway guard rather than a limit anyone should meet:
 * fifty pages is five thousand customers, against a seed of sixty.
 */
const MAX_EXPORT_PAGES = 50

async function fetchEveryCustomer(filters: ListCustomersFilters): Promise<CustomerSummary[]> {
  const all: CustomerSummary[] = []
  let cursor: string | undefined

  for (let page = 0; page < MAX_EXPORT_PAGES; page += 1) {
    // Each request needs the cursor the last one handed back, so these are
    // sequential by nature rather than by oversight.
    const response = await listCustomers({ ...filters, limit: MAX_CUSTOMER_PAGE_SIZE, cursor })

    all.push(...response.rows)

    // Null is the server saying there is no next page, which is what ends the
    // walk — not a short page, which a filter can produce at any point.
    if (response.nextCursor === null) {
      break
    }

    cursor = response.nextCursor
  }

  return all
}

export function useCustomersExport(filters: ListCustomersFilters): UseCustomersExportResult {
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function exportCsv() {
    setIsExporting(true)
    setError(null)

    try {
      const all = await fetchEveryCustomer(filters)

      downloadTextFile(customersCsvFilename(), customersToCsv(all), CUSTOMERS_CSV_MIME_TYPE)
    } catch (cause: unknown) {
      setError(toErrorMessage(cause, 'Could not export customers.'))
    } finally {
      setIsExporting(false)
    }
  }

  return { exportCsv, isExporting, error }
}
