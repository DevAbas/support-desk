import { keepPreviousData, useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { ReportAssigneesResponse, ReportRange } from '@support-desk/shared'
import { getReportAssignees } from '@/lib/api/reports'
import { reportKeys } from '@/features/reports/reportKeys'

interface UseReportAssigneesOptions {
  enabled?: boolean
}

/** One row per assignee with a ticket in the range, busiest first. */
export function useReportAssignees(
  range: ReportRange,
  { enabled = true }: UseReportAssigneesOptions = {},
): UseQueryResult<ReportAssigneesResponse, Error> {
  return useQuery({
    queryKey: reportKeys.assignees(range),
    queryFn: ({ signal }) => getReportAssignees(range, signal),
    placeholderData: keepPreviousData,
    enabled,
  })
}
