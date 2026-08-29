import type { Role } from '@harness-sample/shared'

/**
 * Roles are part of the wire contract — `GET /api/me` returns one — so the values
 * live in the shared domain vocabulary. What a role *means* to this UI stays here.
 */
export { ROLES } from '@harness-sample/shared'
export type { Role } from '@harness-sample/shared'

export const ROLE_LABELS: Record<Role, string> = {
  agent: 'Agent',
  admin: 'Admin',
}

/**
 * Two permissions, both true for an admin today, and deliberately not one flag.
 *
 * They are separate questions — editing the queue and editing the customer list
 * are different powers, and a support desk that grew a third role would split
 * them before it split anything else. Naming them apart also keeps each gate
 * readable at its call site: a customer screen asking `canManageTickets` is a
 * line that reads wrong and that a later reader would have to check.
 */
export interface RoleContextValue {
  role: Role
  setRole: (role: Role) => void
  /** Bulk actions and deletion on the ticket screens are gated on this. */
  canManageTickets: boolean
  /** Bulk actions on the customer list are gated on this. */
  canManageCustomers: boolean
}
