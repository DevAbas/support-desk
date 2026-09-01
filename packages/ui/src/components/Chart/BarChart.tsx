import {
  Bar,
  CartesianGrid,
  Cell,
  LabelList,
  BarChart as RechartsBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '../Table'
import { cn } from '@support-desk/shared'
import { EMPTY_MESSAGE, LOADING_MESSAGE, StateMessage } from '../../primitives/StateMessage'
import type { BarChartProps, ChartTone } from './Chart.types'

/**
 * A horizontal bar chart.
 *
 * This is the only file in the codebase that imports the charting library. Every
 * screen goes through the props above instead, so replacing the library is a
 * change to one component rather than to every report.
 *
 * Two things are deliberately not left to the caller:
 *
 * **Colour.** The library ships its own palette, and a chart drawn in it would
 * be the one thing on the page that does not belong to the design system. Marks
 * read their fill from the same semantic tokens as everything else, through the
 * tone table below, and the grid, axis and tooltip do too.
 *
 * **The data in words.** A chart is a picture, so the picture is hidden from
 * assistive technology and the same numbers are rendered beside it as a table.
 * That is also what makes the neutral tone legible: it sits below the contrast
 * ratio a mark needs to carry meaning on its own, so every bar is labelled with
 * its value and every value is in the table.
 */

/**
 * Marks are drawn from the token custom properties rather than Tailwind classes:
 * an SVG fill is an attribute, not a utility class, and this keeps the values
 * coming from `tokens.css` all the same.
 */
const toneFill: Record<ChartTone, string> = {
  primary: 'var(--color-primary)',
  info: 'var(--color-info)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
  neutral: 'var(--color-fg-subtle)',
}

/** Height per bar, and the room the value labels need to the right of them. */
const BAR_ROW_HEIGHT = 40

const BAR_SIZE = 16

const CATEGORY_AXIS_WIDTH = 96

const VALUE_LABEL_GUTTER = 32

const AXIS_TICK = { fill: 'var(--color-fg-muted)', fontSize: 12 }

export function BarChart({
  caption,
  data,
  valueLabel,
  categoryLabel = 'Category',
  formatValue = (value) => String(value),
  isLoading = false,
  loadingMessage = LOADING_MESSAGE,
  emptyMessage = EMPTY_MESSAGE,
  className,
  ...props
}: BarChartProps) {
  if (isLoading || data.length === 0) {
    return (
      <figure className={className} {...props}>
        <StateMessage isLoading={isLoading}>
          {isLoading ? loadingMessage : emptyMessage}
        </StateMessage>
      </figure>
    )
  }

  // The value is formatted once and both drawn and read from the same string.
  const rows = data.map((datum) => ({ ...datum, formatted: formatValue(datum.value) }))

  return (
    <figure className={cn('flex flex-col', className)} {...props}>
      <div aria-hidden="true">
        <ResponsiveContainer width="100%" height={data.length * BAR_ROW_HEIGHT}>
          <RechartsBarChart
            layout="vertical"
            data={rows}
            margin={{ top: 0, right: VALUE_LABEL_GUTTER, bottom: 0, left: 0 }}
          >
            <CartesianGrid horizontal={false} stroke="var(--color-border)" />
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="label"
              width={CATEGORY_AXIS_WIDTH}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border)' }}
              tick={AXIS_TICK}
            />
            <Tooltip
              cursor={{ fill: 'var(--color-surface-inset)' }}
              content={({ active, label, payload }) => {
                const value = payload[0]?.value

                if (!active || typeof value !== 'number') {
                  return null
                }

                return (
                  <div className="rounded-element border border-border bg-surface px-3 py-2 text-caption shadow-overlay">
                    <p className="font-medium text-fg">{String(label)}</p>
                    <p className="text-fg-muted">{formatValue(value)}</p>
                  </div>
                )
              }}
            />
            <Bar
              dataKey="value"
              barSize={BAR_SIZE}
              radius={[0, 4, 4, 0]}
              isAnimationActive={false}
            >
              {rows.map((row) => (
                <Cell key={row.id} fill={toneFill[row.tone ?? 'primary']} />
              ))}
              <LabelList dataKey="formatted" position="right" fill="var(--color-fg-muted)" fontSize={12} />
            </Bar>
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>

      {/* The same figures, for anyone the picture above is of no use to. */}
      <div className="sr-only">
        <Table caption={caption}>
          <TableHead>
            <TableRow>
              <TableHeaderCell>{categoryLabel}</TableHeaderCell>
              <TableHeaderCell>{valueLabel}</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody columnCount={2}>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.label}</TableCell>
                <TableCell>{row.formatted}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </figure>
  )
}
