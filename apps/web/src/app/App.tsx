import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { BrowserRouter } from 'react-router-dom'
import { createQueryClient } from '@/lib/api/queryClient'
import { RoleProvider } from '@/features/roles/RoleProvider'
import { AppRoutes } from './AppRoutes'

/**
 * One cache for the lifetime of the tab. Built outside the component so that a
 * re-render never swaps it, which would throw away everything it holds.
 */
const queryClient = createQueryClient()

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RoleProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </RoleProvider>

      {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  )
}
