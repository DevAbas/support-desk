import { createContext, useContext } from 'react'
import type { TabsContextValue } from './Tabs.types'

/** Undefined outside `Tabs`, which `useTabsContext` turns into a thrown error. */
export const TabsContext = createContext<TabsContextValue | undefined>(undefined)

export function useTabsContext(): TabsContextValue {
  const value = useContext(TabsContext)

  if (!value) {
    throw new Error('Tab, TabList and TabPanel must be used inside Tabs.')
  }

  return value
}

/**
 * A tab and its panel point at each other, so both ids are derived from the same
 * pair rather than left to the caller to keep in step.
 */
export function tabId(baseId: string, value: string): string {
  return `${baseId}-tab-${value}`
}

export function tabPanelId(baseId: string, value: string): string {
  return `${baseId}-panel-${value}`
}
