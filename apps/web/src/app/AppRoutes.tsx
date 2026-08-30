import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { RequireSession } from '@/features/auth/RequireSession'
import { UnauthorizedRedirect } from '@/features/auth/UnauthorizedRedirect'
import { CustomersPage } from '@/features/customers/CustomersPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
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
            <Route path="tickets" element={<TicketListPage />} />
            <Route path="tickets/new" element={<NewTicketPage />} />
            <Route path="tickets/:ticketId" element={<TicketDetailPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </>
  )
}
