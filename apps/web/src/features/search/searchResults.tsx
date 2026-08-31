import { Avatar, Icon, type CommandPaletteGroup, type CommandPaletteOption } from '@harness-sample/ui'
import type {
  NavigationTarget,
  SearchGroup,
  SearchResult,
  SearchResultType,
} from '@harness-sample/shared'
import { CustomerPlanBadge } from '@/features/customers/components/CustomerPlanBadge'
import { customerPath } from '@/features/customers/openCustomer'
import { TicketStatusBadge } from '@/features/tickets/components/TicketStatusBadge'

/**
 * What a result looks like, and where picking it goes.
 *
 * Both are the feature layer's, which is why neither is on the wire. The server
 * says a ticket was found and what its status is; that a status is drawn as a
 * badge, and which badge, is the mapping `TicketStatusBadge` already owns — and
 * a second copy of it here would be the one that is wrong the day a status is
 * added.
 *
 * The destinations are here for a related reason: two of the three are not the
 * paths they look like. A ticket has a route, a screen carries its own path, and
 * a customer has neither — the customer drawer is a glance over a list rather
 * than a route, so reaching one is a query parameter that `CustomersPage` reads.
 */

/**
 * The heading over each group.
 *
 * "Go to" rather than "Navigation": the group is a list of places, and the
 * heading should read as the thing selecting one does.
 *
 * Keyed by the union, so a result type added without a heading is a compile
 * error rather than a group headed by nothing.
 */
const GROUP_LABELS: Record<SearchResultType, string> = {
  ticket: 'Tickets',
  customer: 'Customers',
  navigation: 'Go to',
}

/**
 * A result's id inside the palette.
 *
 * Namespaced by type because the ids come from three different places and only
 * happen not to collide today: `CUS-0001` and `TCK-0001` are different shapes,
 * and `tickets` the screen and a ticket called `tickets` would not be.
 */
function optionId(result: SearchResult): string {
  return `${result.type}:${result.id}`
}

/** A separator that is prose, not a glyph standing in for one. */
function joinFacts(...facts: string[]): string {
  return facts.join(' · ')
}

function toOption(result: SearchResult): CommandPaletteOption {
  const id = optionId(result)

  switch (result.type) {
    case 'ticket':
      return {
        id,
        title: result.title,
        subtitle: joinFacts(result.id, result.assignee),
        trailing: <TicketStatusBadge status={result.status} />,
      }
    case 'customer':
      return {
        id,
        // Decorative: the name is written beside it, and hearing it twice is
        // worse than not seeing the picture.
        leading: <Avatar name={result.name} src={result.avatarUrl} size="sm" decorative />,
        title: result.name,
        subtitle: joinFacts(result.company, result.email),
        trailing: <CustomerPlanBadge plan={result.plan} />,
      }
    case 'navigation':
      return {
        id,
        leading: <Icon name="arrow-right" size="sm" label="Go to" decorative tone="secondary" />,
        title: result.label,
        subtitle: result.description,
      }
  }
}

function toDestination(result: SearchResult): string {
  switch (result.type) {
    case 'ticket':
      return `/tickets/${encodeURIComponent(result.id)}`
    case 'customer':
      return customerPath(result.id)
    case 'navigation':
      return result.path
  }
}

/**
 * The groups as the palette draws them, and where each option goes.
 *
 * The destinations come back as a lookup rather than being recomputed when
 * something is picked, because the palette hands back an id and the results it
 * came from may already have been replaced by the next keystroke.
 */
export interface PaletteContents {
  groups: CommandPaletteGroup[]
  destinations: ReadonlyMap<string, string>
}

export function toPaletteContents(searchGroups: readonly SearchGroup[]): PaletteContents {
  const destinations = new Map<string, string>()

  const groups = searchGroups.map((group): CommandPaletteGroup => {
    for (const result of group.results) {
      destinations.set(optionId(result), toDestination(result))
    }

    return {
      id: group.type,
      label: GROUP_LABELS[group.type],
      // Only when there is more than is being shown. "5 of 5" is a number that
      // answers nothing; "5 of 40" is a reason to type another word.
      meta:
        group.total > group.results.length
          ? `${String(group.results.length)} of ${String(group.total)}`
          : undefined,
      options: group.results.map(toOption),
    }
  })

  return { groups, destinations }
}

/**
 * What the palette shows before anything is typed: the screens, as a menu.
 *
 * It is built here from the same targets the header nav is drawn from, and it
 * needs no request — there is no searching to do when nothing has been asked,
 * and the alternative would be a round trip to be told the four things the
 * client already knows the names of. Which four depends on the role, and that
 * comes off the same `roles` the server gates on, so an agent's empty palette
 * offers exactly what their header does.
 *
 * Recent items would be the other answer, and this app has nowhere to keep them:
 * there is no record of what anyone opened. Inventing one is a larger feature
 * than the search, and listing the newest tickets instead would be the ticket
 * list, which is the screen every session already opens on.
 */
export function toScreenContents(targets: readonly NavigationTarget[]): PaletteContents {
  return toPaletteContents([
    {
      type: 'navigation',
      total: targets.length,
      results: targets.map((target) => ({
        type: 'navigation',
        id: target.id,
        label: target.label,
        description: target.description,
        path: target.path,
      })),
    },
  ])
}
