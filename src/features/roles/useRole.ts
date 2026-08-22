import { useContext } from 'react'
import { RoleContext } from './RoleContext'
import type { RoleContextValue } from './role.types'

export function useRole(): RoleContextValue {
  const value = useContext(RoleContext)

  if (!value) {
    throw new Error('useRole must be used inside a RoleProvider.')
  }

  return value
}
