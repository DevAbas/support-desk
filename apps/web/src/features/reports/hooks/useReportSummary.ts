import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { ReportRange, ReportSummaryResponse } from '@harness-sample/shared'
import { getReportSummary } from '@/lib/api/reports'
import { reportKeys } from '@/features/reports/reportKeys'

interface UseReportOptions {
  enabled?: boolean
}

/**
 * The four headline figures for a range, each already compared with the period
 * before it.
 *
 * The previous range is kept on screen while the next one loads, the same way
 * the ticket list keeps the previous page: moving the range should redraw the
 * figures, not empty the page and fill it again. `isPending` is therefore true
 * only on the first load; `isFetching` is what to disable controls on.
 */
export function useReportSummary(
  range: ReportRange,
  { enabled = true }: UseReportOptions = {},
): UseQueryResult<ReportSummaryResponse, Error> {
  return useQuery({
    queryKey: reportKeys.summary(range),
    queryFn: ({ signal }) => getReportSummary(range, signal),
    placeholderData: keepPreviousData,
    enabled,
  })
}
