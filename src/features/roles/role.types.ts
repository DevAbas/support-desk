export const ROLES = ['agent', 'admin'] as const

export type Role = (typeof ROLES)[number]

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
