import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { RoleProvider } from '../features/roles/RoleProvider'
import { NewTicketPage } from '../features/tickets/NewTicketPage'
import { TicketDetailPage } from '../features/tickets/TicketDetailPage'
import { TicketListPage } from '../features/tickets/TicketListPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { AppLayout } from './AppLayout'
import { NotFoundPage } from './NotFoundPage'

export function App() {
  return (
    <RoleProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/tickets" replace />} />
            <Route path="tickets" element={<TicketListPage />} />
            <Route path="tickets/new" element={<NewTicketPage />} />
            <Route path="tickets/:ticketId" element={<TicketDetailPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </RoleProvider>
  )
}
