import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { RequireSession } from '@/features/auth/RequireSession'
import { UnauthorizedRedirect } from '@/features/auth/UnauthorizedRedirect'
import { CustomersPage } from '@/features/customers/CustomersPage'
import { PlansPage } from '@/features/plans/PlansPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { RequireRole } from '@/features/roles/RequireRole'
import { NewTicketPage } from '@/features/tickets/NewTicketPage'
import { TicketDetailPage } from '@/features/tickets/TicketDetailPage'
import { TicketListPage } from '@/features/tickets/TicketListPage'
import { AppLayout } from './AppLayout'
import { NotFoundPage } from './NotFoundPage'

/**
 * Every route in the app, and the two things that decide who reaches them.
 *
 * Separate from `App` so that it can be rendered inside a `MemoryRouter`: route
 * protection is the one behaviour here that only exists *between* routes, and a
 * test that rendered a page component directly would never see it. `App` is then
 * the providers and the browser router, and nothing else.
 */
export function AppRoutes() {
  return (
    <>
      <UnauthorizedRedirect />

      <Routes>
        {/* Outside the shell: there is nothing to navigate to yet. */}
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />

        <Route element={<RequireSession />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/tickets" replace />} />

            {/* Not every screen is everyone's, and every screen is behind the
                gate that asks. `RequireRole` reads the same `roles` the nav is
                drawn from and the search is filtered by, so naming a role on a
                target in `NAVIGATION_TARGETS` closes the nav item, the address
                and the search result together.

                Three of these five gates let both roles through today, which
                is the point: they are what makes that edit one edit. A guard
                added at the moment a screen is first narrowed is a guard
                somebody has to remember, and the day it is forgotten the search
                is still offering a door the header has closed. */}
            <Route element={<RequireRole target="tickets" />}>
              <Route path="tickets" element={<TicketListPage />} />
              {/* Not a screen of its own — it is where a ticket result goes, and
                  the server gates those on the queue. */}
              <Route path="tickets/:ticketId" element={<TicketDetailPage />} />
            </Route>
            <Route element={<RequireRole target="new-ticket" />}>
              <Route path="tickets/new" element={<NewTicketPage />} />
            </Route>
            <Route element={<RequireRole target="customers" />}>
              <Route path="customers" element={<CustomersPage />} />
            </Route>
            <Route element={<RequireRole target="plans" />}>
              <Route path="plans" element={<PlansPage />} />
            </Route>
            <Route element={<RequireRole target="reports" />}>
              <Route path="reports" element={<ReportsPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </>
  )
}
