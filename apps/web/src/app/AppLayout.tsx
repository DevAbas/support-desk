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
            {/* The product's name, and not a `Heading`: every page inside this
                shell renders its own `level="page"`, so a heading here would put
                an `h2` above every `h1` in the app. It takes the semantic level
                directly instead. What it replaced — `text-base font-semibold` —
                was a level being reassembled by hand at a step the scale
                deliberately does not have, since only the three headings carry
                weight; `section` is the one that makes the wordmark out-weigh
                the nav beside it, which is what a wordmark is for. */}
            <span className="text-section text-fg">Support Desk</span>
            <nav aria-label="Main">
              <ul className="flex items-center gap-1">
                {navigation.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      className={({ isActive }) =>
                        cn(
                          'inline-flex h-9 items-center rounded-element px-3 text-body font-medium',
                          // A link is not a `Button`, so it does not get the
                          // states for free — but it answers a pointer like
                          // one, and `interactive` is how it says so. `text-body`
                          // is the rest of that: it is the level `Button` sets at
                          // both sizes, so the nav sits on the same step as the
                          // controls beside it instead of a raw one under them.
                          'interactive focus-ring',
                          // The one selected-looking thing in the product that
                          // is not on the primary tint. A tint of this teal has
                          // to carry the page's yellow to sit on it, and by the
                          // time it does it is a green — which is where
                          // `success` lives, so the nav item was announcing a
                          // status it does not have. `surface-inset` is the
                          // palette's own warm neutral: it collides with no
                          // status, and it agrees with the neutral tint the
                          // item beside it wears on hover. The state is carried
                          // by the ink as much as the fill — `fg` at 13.1:1
                          // against `fg-muted`'s 6.9:1 on the header.
                          isActive
                            ? 'bg-surface-inset text-fg'
                            : 'text-fg-muted hover:text-fg',
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
