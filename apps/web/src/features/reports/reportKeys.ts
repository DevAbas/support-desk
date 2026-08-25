import type { ReportBreakdownQuery, ReportRange } from '@harness-sample/shared'

/**
 * Every cache key the reports screen uses.
 *
 * The same rule as `ticketKeys`: keys are never written as inline arrays at a
 * call site, so the hierarchy stays usable and a typo cannot quietly split the
 * cache.
 *
 * The range is part of every key, because it is part of every question. Two
 * ranges are two different answers, and a report cached without its range would
 * show last quarter's figures under this quarter's heading. `breakdown` takes
 * the whole query for the same reason `ticketKeys.list` does: a dimension left
 * out of the key is a chart that does not change when the tab does.
 */

const all = ['reports'] as const

export const reportKeys = {
  all: () => all,
  summary: (range: ReportRange) => [...all, 'summary', range] as const,
  breakdown: (query: ReportBreakdownQuery) => [...all, 'breakdown', query] as const,
  assignees: (range: ReportRange) => [...all, 'assignees', range] as const,
}
