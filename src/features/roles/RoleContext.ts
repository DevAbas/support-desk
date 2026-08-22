import { createContext } from 'react'
import type { RoleContextValue } from './role.types'

/** Undefined outside a provider, which `useRole` turns into a thrown error. */
export const RoleContext = createContext<RoleContextValue | undefined>(undefined)
