import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderResult } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { RoleProvider } from '../features/roles/RoleProvider'
import type { Role } from '../features/roles/role.types'

interface Options {
  role?: Role
  initialEntries?: string[]
  /** Pass one in to inspect the cache, or to share it across two renders. */
  queryClient?: QueryClient
}

/**
 * A cache per render, so nothing leaks between tests, and no retries: a test
 * asserting on an error state should see it once rather than after a backoff.
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  })
}

/** Renders a screen with the providers the app supplies in `App.tsx`. */
export function renderWithProviders(
  ui: ReactNode,
  { role = 'agent', initialEntries = ['/'], queryClient = createTestQueryClient() }: Options = {},
): RenderResult {
  return render(
    <QueryClientProvider client={queryClient}>
      <RoleProvider initialRole={role}>
        <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
      </RoleProvider>
    </QueryClientProvider>,
  )
}
