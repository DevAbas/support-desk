import { Link } from 'react-router-dom'
import {
  Alert,
  Avatar,
  Button,
  Drawer,
  Heading,
  List,
  ListRow,
  StatCard,
  StateMessage,
} from '@harness-sample/ui'
import { toErrorMessage } from '@/lib/api/http'
import { formatDate } from '@/lib/format'
import type { Customer } from '@harness-sample/shared'
// The mapping from a ticket status to a badge appearance already exists, and it
// belongs to the ticket feature. A second copy here would be a second thing to
// get wrong the day a status is added.
import { TicketStatusBadge } from '@/features/tickets/components/TicketStatusBadge'
import { useCustomer } from '../hooks/useCustomer'
import { CustomerPlanBadge } from './CustomerPlanBadge'

interface CustomerDrawerProps {
  /** Null while the drawer is closed. Changing it swaps who is being shown. */
  customerId: string | null
  onClose: () => void
}

/**
 * One customer, over the list rather than instead of it.
 *
 * This is not a route. Reading a customer is something done *while* working
 * through the list — open one, glance at it, close it, open the next — and a URL
 * for each of those would put every glance in the browser's history to be backed
 * out of one at a time.
 *
 * The drawer owns its own query rather than being handed the data, so the list
 * stays a list of rows. A row knows how many tickets someone has; what those
 * tickets are is a request, and it is made when someone actually asks.
 */
export function CustomerDrawer({ customerId, onClose }: CustomerDrawerProps) {
  const customer = useCustomer(customerId)
  const error = customer.isError
    ? toErrorMessage(customer.error, 'Could not load this customer.')
    : null

  return (
    <Drawer
      open={customerId !== null}
      onClose={onClose}
      title={customer.data?.name ?? 'Customer'}
      description={customer.data?.company}
    >
      {customer.isPending ? <StateMessage isLoading>Loading customer…</StateMessage> : null}

      {error ? (
        <Alert
          tone="danger"
          title="Could not load this customer"
          action={
            <Button variant="secondary" size="sm" onClick={() => void customer.refetch()}>
              Try again
            </Button>
          }
        >
          {error}
        </Alert>
      ) : null}

      {customer.data ? <CustomerDetail customer={customer.data} /> : null}
    </Drawer>
  )
}

interface CustomerDetailProps {
  customer: Customer
}

function CustomerDetail({ customer }: CustomerDetailProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        {/* Decorative: the drawer's heading is already this person's name. */}
        <Avatar name={customer.name} src={customer.avatarUrl} size="lg" decorative />

        <div className="flex min-w-0 flex-col gap-1">
          <a
            href={`mailto:${customer.email}`}
            className="truncate text-body text-primary underline-offset-2 hover:underline focus-ring"
          >
            {customer.email}
          </a>
          <CustomerPlanBadge plan={customer.plan} />
        </div>
      </div>

      {/* Two figures about one customer, which is what `StatCard` is. They were
          a hand-built pair of label-and-value stacks a scale step off it. */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Signed up" value={formatDate(customer.signupDate)} />
        <StatCard label="Tickets raised" value={customer.ticketCount} />
      </div>

      <div className="flex flex-col gap-2">
        <Heading level="subsection">Tickets</Heading>

        <List
          label={`Tickets raised by ${customer.name}`}
          isEmpty={customer.tickets.length === 0}
          emptyMessage="No tickets raised yet."
          className="rounded-element border border-border"
        >
          {customer.tickets.map((ticket) => (
            // No `onSelect` here: this row goes somewhere, and going somewhere
            // is a link. The whole row is the control on the customer list
            // because that row opens a drawer, which is not a destination.
            <ListRow
              key={ticket.id}
              title={
                <Link
                  to={`/tickets/${ticket.id}`}
                  className="font-medium text-primary underline-offset-2 hover:underline focus-ring"
                >
                  {ticket.title}
                </Link>
              }
              subtitle={`${ticket.id} · ${formatDate(ticket.createdAt)}`}
              trailing={<TicketStatusBadge status={ticket.status} />}
            />
          ))}
        </List>
      </div>
    </div>
  )
}
