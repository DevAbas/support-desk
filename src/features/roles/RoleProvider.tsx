import { useMemo, useState, type ReactNode } from 'react'
import { RoleContext } from './RoleContext'
import type { Role } from './role.types'

interface RoleProviderProps {
  children: ReactNode
  initialRole?: Role
}

export function RoleProvider({ children, initialRole = 'agent' }: RoleProviderProps) {
  const [role, setRole] = useState<Role>(initialRole)

  const value = useMemo(
    () => ({ role, setRole, canManageTickets: role === 'admin' }),
    [role],
  )

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}
