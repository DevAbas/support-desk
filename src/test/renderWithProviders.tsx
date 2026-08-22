import { render, type RenderResult } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { RoleProvider } from '../features/roles/RoleProvider'
import type { Role } from '../features/roles/role.types'

interface Options {
  role?: Role
  initialEntries?: string[]
}

/** Renders a screen with the providers the app supplies in `App.tsx`. */
export function renderWithProviders(
  ui: ReactNode,
  { role = 'agent', initialEntries = ['/'] }: Options = {},
): RenderResult {
  return render(
    <RoleProvider initialRole={role}>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </RoleProvider>,
  )
}
