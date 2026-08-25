import { useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  DateRangeField,
  Tab,
  TabList,
  TabPanel,
  Tabs,
} from '@/design-system'
import { toErrorMessage } from '@/lib/api/http'
import { downloadTextFile } from '@/lib/download'
import { formatDate } from '@/lib/format'
import type { ReportBreakdownQuery, ReportRange } from '@harness-sample/shared'
import { ReportAssigneeTable } from './components/ReportAssigneeTable'
import { ReportBreakdownChart } from './components/ReportBreakdownChart'
import { ReportSummaryCards } from './components/ReportSummaryCards'
import { ReportToolbar } from './components/ReportToolbar'
import { useReportAssignees } from './hooks/useReportAssignees'
import { useReportBreakdown } from './hooks/useReportBreakdown'
import { useReportSummary } from './hooks/useReportSummary'
import { defaultReportRange, reportPresets, toIsoDate } from './reportRanges'
import { assigneesToCsv, breakdownToCsv, reportCsvFilename, REPORTS_CSV_MIME_TYPE } from './reportsCsv'
import { isReportView, REPORT_VIEWS, REPORT_VIEW_LABELS } from './reportViews'

/**
 * How the queue has been moving over a range.
 *
 * The range is the whole screen's one input: the figures, the charts and the
 * table are all the same cohort of tickets, and all four are counted by the
 * server. Nothing here fetches tickets.
 *
 * Only the view on screen is queried. The other two are the same range asked a
 * different way, and asking all three on the first paint would be two requests
 * nobody is reading.
 */
export function ReportsPage() {
  const [range, setRange] = useState<ReportRange>(() => defaultReportRange())
  const [view, setView] = useState('status')

  // Fixed for the life of the screen. "The last 7 days" resolving to a new range
  // mid-session would quietly move the report under whoever is reading it.
  const presets = useMemo(() => reportPresets(), [])
  const today = useMemo(() => toIsoDate(new Date()), [])

  const isAssigneeView = view === 'assignee'

  const breakdownQuery: ReportBreakdownQuery = {
    ...range,
    // The assignee view has no dimension; the query is held back anyway, and
    // this keeps its key stable rather than inventing one.
    dimension: view === 'priority' ? 'priority' : 'status',
  }

  const summary = useReportSummary(range)
  const breakdown = useReportBreakdown(breakdownQuery, { enabled: !isAssigneeView })
  const assignees = useReportAssignees(range, { enabled: isAssigneeView })

  const activeView = isAssigneeView ? assignees : breakdown
  const summaryError = summary.isError
    ? toErrorMessage(summary.error, 'Could not load the summary.')
    : null
  const viewError = activeView.isError
    ? toErrorMessage(activeView.error, 'Could not load this view.')
    : null

  const total = summary.data?.totalTickets.value ?? 0

  /**
   * No second request: the view on screen is already the aggregation, so the
   * export is the data that is on screen rather than another round trip that
   * could answer differently.
   */
  function exportCurrentView() {
    const csv = isAssigneeView
      ? assignees.data && assigneesToCsv(assignees.data)
      : breakdown.data && breakdownToCsv(breakdown.data)

    if (csv === undefined) {
      return
    }

    downloadTextFile(
      reportCsvFilename(isReportView(view) ? view : 'status', range),
      csv,
      REPORTS_CSV_MIME_TYPE,
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-fg">Reports</h1>
        <p className="text-sm text-fg-muted">
          How the queue has been moving, over the range you choose.
        </p>
      </div>

      <Card>
        <CardBody>
          <DateRangeField
            legend="Date range"
            value={range}
            presets={presets}
            onChange={setRange}
            max={today}
          />
        </CardBody>
      </Card>

      {summaryError ? (
        <Alert
          tone="danger"
          title="Could not load the summary"
          action={
            <Button variant="secondary" size="sm" onClick={() => void summary.refetch()}>
              Try again
            </Button>
          }
        >
          {summaryError}
        </Alert>
      ) : null}

      <ReportSummaryCards summary={summary.data} isLoading={summary.isPending} />

      <Card className="overflow-hidden">
        <CardHeader
          title="Breakdown"
          description={`${String(total)} ${total === 1 ? 'ticket' : 'tickets'} raised between ${formatDate(range.from)} and ${formatDate(range.to)}.`}
        />

        <CardBody>
          <Tabs
            value={view}
            label="Report views"
            onValueChange={(next) => {
              if (isReportView(next)) {
                setView(next)
              }
            }}
          >
            <TabList>
              {REPORT_VIEWS.map((reportView) => (
                <Tab key={reportView} value={reportView}>
                  {REPORT_VIEW_LABELS[reportView]}
                </Tab>
              ))}
            </TabList>

            {viewError ? (
              <Alert
                tone="danger"
                title="Could not load this view"
                action={
                  <Button variant="secondary" size="sm" onClick={() => void activeView.refetch()}>
                    Try again
                  </Button>
                }
              >
                {viewError}
              </Alert>
            ) : null}

            <TabPanel value="status">
              <ReportBreakdownChart breakdown={breakdown.data} isLoading={breakdown.isPending} />
            </TabPanel>

            <TabPanel value="priority">
              <ReportBreakdownChart breakdown={breakdown.data} isLoading={breakdown.isPending} />
            </TabPanel>

            <TabPanel value="assignee">
              <ReportAssigneeTable assignees={assignees.data} isLoading={assignees.isPending} />
            </TabPanel>
          </Tabs>
        </CardBody>

        <ReportToolbar
          onExport={exportCurrentView}
          disabled={activeView.data === undefined || total === 0}
        />
      </Card>
    </div>
  )
}
