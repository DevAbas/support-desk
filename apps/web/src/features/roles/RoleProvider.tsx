import { useMemo, type ReactNode } from 'react'
import { useSession } from '@/features/auth/useSession'
import { RoleContext } from './RoleContext'
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
  // The role is the session's, and there is no longer anywhere to override it:
  // the Settings page that used to hold a switcher was there because the server
  // had no authentication to enforce, and it does now. Signing in as somebody
  // else is how you see the app as somebody else.
  const session = useSession({ enabled: initialRole === undefined })

  const role = initialRole ?? session.data?.user.role ?? 'agent'

  const value = useMemo(
    () => ({
      role,
      canManageTickets: role === 'admin',
      canManageCustomers: role === 'admin',
    }),
    [role],
  )

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}
