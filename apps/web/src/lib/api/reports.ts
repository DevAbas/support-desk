import {
  reportAssigneesResponseSchema,
  reportBreakdownQuerySchema,
  reportBreakdownResponseSchema,
  reportRangeQuerySchema,
  reportSummaryResponseSchema,
  type ReportAssigneesResponse,
  type ReportBreakdownQuery,
  type ReportBreakdownResponse,
  type ReportRangeQuery,
  type ReportSummaryResponse,
} from '@harness-sample/shared'
import { apiRequest } from './http'

/**
 * One function per reporting endpoint, in the same shape as `tickets.ts`: these
 * know about HTTP and nothing about React.
 *
 * Every one of them answers with figures rather than rows. Nothing here fetches
 * tickets for the client to count — the aggregation is the server's, and a
 * screen that did its own would disagree with the export sitting next to it.
 */

export function getReportSummary(
  query: ReportRangeQuery,
  signal?: AbortSignal,
): Promise<ReportSummaryResponse> {
  return apiRequest('/reports/summary', {
    schema: reportSummaryResponseSchema,
    query: reportRangeQuerySchema.parse(query),
    signal,
  })
}

export function getReportBreakdown(
  query: ReportBreakdownQuery,
  signal?: AbortSignal,
): Promise<ReportBreakdownResponse> {
  return apiRequest('/reports/breakdown', {
    schema: reportBreakdownResponseSchema,
    query: reportBreakdownQuerySchema.parse(query),
    signal,
  })
}

export function getReportAssignees(
  query: ReportRangeQuery,
  signal?: AbortSignal,
): Promise<ReportAssigneesResponse> {
  return apiRequest('/reports/assignees', {
    schema: reportAssigneesResponseSchema,
    query: reportRangeQuerySchema.parse(query),
    signal,
  })
}
