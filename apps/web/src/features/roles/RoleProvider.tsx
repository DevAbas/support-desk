import { useMemo, useState, type ReactNode } from 'react'
import { RoleContext } from './RoleContext'
import { useMe } from './useMe'
import type { Role } from './role.types'

interface RoleProviderProps {
  children: ReactNode
  /**
   * Fixes the role instead of asking the API for it. Tests use this to render a
   * screen as an admin without a round trip.
   */
  initialRole?: Role
}

export function RoleProvider({ children, initialRole }: RoleProviderProps) {
  // A role picked on the Settings page outranks whatever the API reported. The
  // server has no authentication to enforce, so this is the whole of it.
  const [chosenRole, setChosenRole] = useState<Role | null>(initialRole ?? null)
  const me = useMe({ enabled: initialRole === undefined })

  const role = chosenRole ?? me.data?.role ?? 'agent'

  const value = useMemo(
    () => ({ role, setRole: setChosenRole, canManageTickets: role === 'admin' }),
    [role],
  )

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}
