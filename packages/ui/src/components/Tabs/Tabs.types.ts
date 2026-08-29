import type { ComponentPropsWithRef, ReactNode } from 'react'

export interface TabsContextValue {
  /** The value of the tab currently selected. */
  value: string
  onValueChange: (value: string) => void
  /** Names the tab strip for screen readers. */
  label: string
  /** Roots the generated tab and panel ids, so two tab strips cannot collide. */
  baseId: string
}

export interface TabsProps extends Omit<ComponentPropsWithRef<'div'>, 'onChange'> {
  value: string
  onValueChange: (value: string) => void
  /** Accessible name for the tab strip, e.g. "Report views". */
  label: string
  children: ReactNode
}

export type TabListProps = ComponentPropsWithRef<'div'>

export interface TabProps extends Omit<ComponentPropsWithRef<'button'>, 'value' | 'role'> {
  /** Matched against the selected value, and used to build the pair of ids. */
  value: string
}

export interface TabPanelProps extends ComponentPropsWithRef<'div'> {
  value: string
}
