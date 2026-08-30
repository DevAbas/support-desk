import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Badge, Button, Text } from '@harness-sample/ui'
import { cn } from '@harness-sample/shared'
import { useSession } from '@/features/auth/useSession'
import { useSignOut } from '@/features/auth/useSignOut'
import { ROLE_LABELS } from '@/features/roles/role.types'
import { useRole } from '@/features/roles/useRole'

const navigation = [
  { to: '/tickets', label: 'Tickets' },
  { to: '/customers', label: 'Customers' },
  { to: '/reports', label: 'Reports' },
]

/**
 * Who you are, and the way out.
 *
 * This replaced a badge reading "Signed in as Admin", which was the whole of
 * what the app could say when the role came from an environment variable. There
 * is a person behind it now, so the header says their name; the role stays
 * beside it because it is what decides whether half the controls on the screen
 * are there.
 */
function SignedInAs() {
  const navigate = useNavigate()
  const { role } = useRole()
  const session = useSession()
  const signOut = useSignOut()

  return (
    <div className="flex items-center gap-3">
      <Text as="span" tone="muted">
        {session.data?.user.name}
      </Text>
      <Badge status={role === 'admin' ? 'info' : 'neutral'}>{ROLE_LABELS[role]}</Badge>
      <Button
        variant="ghost"
        size="sm"
        disabled={signOut.isPending}
        onClick={() => {
          signOut.mutate(undefined, { onSettled: () => navigate('/login', { replace: true }) })
        }}
      >
        {signOut.isPending ? 'Signing out…' : 'Sign out'}
      </Button>
    </div>
  )
}

export function AppLayout() {
  return (
    <div className="min-h-screen bg-surface-muted">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-8">
            <span className="text-base font-semibold text-fg">Support Desk</span>
            <nav aria-label="Main">
              <ul className="flex items-center gap-1">
                {navigation.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      className={({ isActive }) =>
                        cn(
                          'inline-flex h-9 items-center rounded-md px-3 text-sm font-medium transition-colors',
                          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                          isActive
                            ? 'bg-primary-subtle text-primary-subtle-fg'
                            : 'text-fg-muted hover:bg-muted hover:text-fg',
                        )
                      }
                    >
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <SignedInAs />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
