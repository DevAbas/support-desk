import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { ReportBreakdownQuery, ReportBreakdownResponse } from '@harness-sample/shared'
import { getReportBreakdown } from '@/lib/api/reports'
import { reportKeys } from '@/features/reports/reportKeys'

interface UseReportBreakdownOptions {
  /**
   * False while another view is showing. The breakdown and the assignee table
   * answer the same range in two different shapes, and only the one on screen is
   * worth asking for.
   */
  enabled?: boolean
}

/** A range broken down by one dimension, counted server-side. */
export function useReportBreakdown(
  query: ReportBreakdownQuery,
  { enabled = true }: UseReportBreakdownOptions = {},
): UseQueryResult<ReportBreakdownResponse, Error> {
  return useQuery({
    queryKey: reportKeys.breakdown(query),
    queryFn: ({ signal }) => getReportBreakdown(query, signal),
    placeholderData: keepPreviousData,
    enabled,
  })
}
