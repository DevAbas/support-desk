import { NavLink, Outlet } from 'react-router-dom'
import { Badge } from '@/design-system'
import { cn } from '@/lib/cn'
import { ROLE_LABELS } from '@/features/roles/role.types'
import { useRole } from '@/features/roles/useRole'

const navigation = [
  { to: '/tickets', label: 'Tickets' },
  { to: '/settings', label: 'Settings' },
]

export function AppLayout() {
  const { role } = useRole()

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

          <div className="flex items-center gap-2">
            <span className="text-sm text-fg-muted">Signed in as</span>
            <Badge status={role === 'admin' ? 'info' : 'neutral'}>{ROLE_LABELS[role]}</Badge>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
