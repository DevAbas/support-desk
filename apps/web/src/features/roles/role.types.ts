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

export interface RoleContextValue {
  role: Role
  setRole: (role: Role) => void
  /** True for admins. Bulk actions and deletion are gated on this. */
  canManageTickets: boolean
}
