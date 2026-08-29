import { Link } from 'react-router-dom'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@harness-sample/ui'
import { formatDate } from '@/lib/format'
import type { Ticket } from '@harness-sample/shared'
import { TicketPriorityBadge } from './TicketPriorityBadge'
import { TicketStatusBadge } from './TicketStatusBadge'

interface TicketsTableProps {
  tickets: Ticket[]
  isLoading: boolean
  /** Selection is only offered to admins, so the checkbox column is optional. */
  selectable: boolean
  selectedIds: readonly string[]
  onToggleTicket: (id: string) => void
  onToggleAll: (selected: boolean) => void
}

export function TicketsTable({
  tickets,
  isLoading,
  selectable,
  selectedIds,
  onToggleTicket,
  onToggleAll,
}: TicketsTableProps) {
  const columnCount = selectable ? 6 : 5
  const allSelected = tickets.length > 0 && tickets.every((ticket) => selectedIds.includes(ticket.id))

  return (
    <Table caption="Support tickets">
      <TableHead>
        <TableRow>
          {selectable ? (
            <TableHeaderCell className="w-12">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                aria-label="Select all tickets on this page"
                checked={allSelected}
                onChange={(event) => onToggleAll(event.target.checked)}
                disabled={isLoading || tickets.length === 0}
              />
            </TableHeaderCell>
          ) : null}
          <TableHeaderCell className="w-28">Ticket</TableHeaderCell>
          <TableHeaderCell>Title</TableHeaderCell>
          <TableHeaderCell className="w-28">Status</TableHeaderCell>
          <TableHeaderCell className="w-28">Priority</TableHeaderCell>
          <TableHeaderCell className="w-32">Created</TableHeaderCell>
        </TableRow>
      </TableHead>

      <TableBody
        columnCount={columnCount}
        isLoading={isLoading}
        isEmpty={tickets.length === 0}
        loadingMessage="Loading tickets…"
        emptyMessage="No tickets match these filters."
      >
        {tickets.map((ticket) => (
          <TableRow key={ticket.id} className="hover:bg-surface-muted">
            {selectable ? (
              <TableCell>
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  aria-label={`Select ticket ${ticket.id}`}
                  checked={selectedIds.includes(ticket.id)}
                  onChange={() => onToggleTicket(ticket.id)}
                />
              </TableCell>
            ) : null}
            <TableCell className="font-mono text-xs text-fg-muted">{ticket.id}</TableCell>
            <TableCell>
              <Link
                to={`/tickets/${ticket.id}`}
                className="font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {ticket.title}
              </Link>
            </TableCell>
            <TableCell>
              <TicketStatusBadge status={ticket.status} />
            </TableCell>
            <TableCell>
              <TicketPriorityBadge priority={ticket.priority} />
            </TableCell>
            <TableCell className="text-sm text-fg-muted">{formatDate(ticket.createdAt)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
