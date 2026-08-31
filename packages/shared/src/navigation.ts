import { z } from 'zod'
import { ROLES, type Role } from './types'

/**
 * Every screen this app has, as one table.
 *
 * It lives in the shared contract rather than in the header that draws it,
 * because three things now have to agree about what the screens are and who may
 * reach them: the nav in `AppLayout`, the route guard behind it, and the global
 * search, which must not offer a destination the nav does not. Those were going
 * to be three lists, and the day they disagreed the search would be the one
 * quietly handing an agent a door the header had already closed.
 *
 * `roles` is what makes that structural rather than remembered. A screen names
 * who may reach it once; the header filters on it, the guard reads it, and the
 * search gates both the navigation results *and* the record results on it — so
 * gating a screen tomorrow takes its records out of everyone else's search
 * without the search being edited.
 *
 * Nothing here is presentation. `label` and `description` are what the screen is
 * called and what it is for, which is domain vocabulary in the same way
 * `TICKET_STATUS_LABELS` is; how a nav item or a search result *looks* stays in
 * the feature layer.
 */

export const NAVIGATION_TARGET_IDS = ['tickets', 'new-ticket', 'customers', 'reports'] as const

export type NavigationTargetId = (typeof NAVIGATION_TARGET_IDS)[number]

export const navigationTargetIdSchema = z.enum(NAVIGATION_TARGET_IDS)

export interface NavigationTarget {
  id: NavigationTargetId
  /** What the screen is called, in the header and in a search result. */
  label: string
  /** One line saying what it is for. Search reads it, so it is not decoration. */
  description: string
  path: string
  /**
   * Words that should find the screen but are not written on it.
   *
   * A person looking for the queue types "inbox" as readily as "tickets", and a
   * search that only reads labels answers half of them. They are here rather
   * than in the search because they are facts about the screen.
   */
  keywords: readonly string[]
  /** Who may reach it. */
  roles: readonly Role[]
  /**
   * Whether the header nav draws it.
   *
   * Not every screen is a nav item — raising a ticket is reached from the queue
   * — but every screen is a place the search can take you, which is why this is
   * a flag on one table rather than two tables.
   */
  inHeader: boolean
}

/**
 * The screens, in the order the header draws them.
 *
 * **Reports is administrators' work**, and it is the one gate here. It is the
 * only screen in this product whose subject is the agents rather than the queue:
 * `ReportAssigneeTable` ranks named people by how much they resolved, which is a
 * manager's view of a team and not a tool for working through it. Every other
 * screen is somebody's daily work and both roles have it.
 */
export const NAVIGATION_TARGETS: readonly NavigationTarget[] = [
  {
    id: 'tickets',
    label: 'Tickets',
    description: 'The support queue, filtered and paged.',
    path: '/tickets',
    keywords: ['queue', 'inbox', 'open', 'list'],
    roles: ROLES,
    inHeader: true,
  },
  {
    id: 'new-ticket',
    label: 'New ticket',
    description: 'Raise a ticket on behalf of a customer.',
    path: '/tickets/new',
    keywords: ['create', 'raise', 'add', 'log'],
    roles: ROLES,
    inHeader: false,
  },
  {
    id: 'customers',
    label: 'Customers',
    description: 'Everyone using the product, and what they have raised.',
    path: '/customers',
    keywords: ['accounts', 'people', 'companies', 'plans'],
    roles: ROLES,
    inHeader: true,
  },
  {
    id: 'reports',
    label: 'Reports',
    description: 'How the queue has been moving over a range.',
    path: '/reports',
    keywords: ['analytics', 'charts', 'figures', 'performance'],
    roles: ['admin'],
    inHeader: true,
  },
]

/** Every screen this role may reach, in table order. */
export function navigationTargetsFor(role: Role): NavigationTarget[] {
  return NAVIGATION_TARGETS.filter((target) => target.roles.includes(role))
}

/**
 * Whether this role has a way in to that screen.
 *
 * The one question both the route guard and the search ask, so that "an agent
 * cannot reach it" is one answer rather than two implementations of one rule.
 */
export function canReachNavigationTarget(role: Role, id: NavigationTargetId): boolean {
  return NAVIGATION_TARGETS.some((target) => target.id === id && target.roles.includes(role))
}
