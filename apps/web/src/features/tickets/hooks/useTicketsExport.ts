import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { MAX_PAGE_SIZE, type ListTicketsQuery } from '@harness-sample/shared'
import { toErrorMessage } from '@/lib/api/http'
import { listTickets } from '@/lib/api/tickets'
import { downloadTextFile } from '@/lib/download'
import { useTaxonomySets } from '@/features/taxonomy/useTaxonomy'
import { ticketKeys } from '@/features/tickets/ticketKeys'
import { TICKETS_CSV_MIME_TYPE, ticketsCsvFilename, ticketsToCsv } from '@/features/tickets/ticketsCsv'

interface UseTicketsExportResult {
  exportCsv: () => Promise<void>
  isExporting: boolean
  error: string | null
}

/**
 * Exports every ticket the filters match, not just the page on screen, so the
 * file means the same thing from any page.
 *
 * That is a different request from the one the table is showing — one page big
 * enough to hold the whole result — so it goes through `fetchQuery` under its
 * own key rather than reading the table's. Asking for it that way means it is
 * cached and invalidated with every other list, so an export taken straight
 * after a bulk update does not describe the queue as it was.
 */
export function useTicketsExport(
  query: ListTicketsQuery,
  total: number,
): UseTicketsExportResult {
  const queryClient = useQueryClient()
  const taxonomy = useTaxonomySets()
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function exportCsv() {
    setIsExporting(true)
    setError(null)

    const exportQuery: ListTicketsQuery = {
      ...query,
      page: 1,
      // A page size of zero is not a valid request, and the endpoint will not
      // serve an unbounded one.
      pageSize: Math.min(Math.max(total, 1), MAX_PAGE_SIZE),
    }

    try {
      const all = await queryClient.fetchQuery({
        queryKey: ticketKeys.list(exportQuery),
        queryFn: ({ signal }) => listTickets(exportQuery, signal),
      })

      downloadTextFile(
        ticketsCsvFilename(),
        ticketsToCsv(all.rows, taxonomy),
        TICKETS_CSV_MIME_TYPE,
      )
    } catch (cause: unknown) {
      setError(toErrorMessage(cause, 'Could not export tickets.'))
    } finally {
      setIsExporting(false)
    }
  }

  return { exportCsv, isExporting, error }
}
