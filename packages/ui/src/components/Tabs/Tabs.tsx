import { useId, useMemo, type KeyboardEvent } from 'react'
import { Button } from '../../primitives/Button'
import { cn } from '@support-desk/shared'
import { TabsContext, tabId, tabPanelId, useTabsContext } from './TabsContext'
import type { TabListProps, TabPanelProps, TabProps, TabsProps } from './Tabs.types'

/**
 * A tab strip and its panels, following the ARIA tabs pattern.
 *
 * Selection is controlled: the value lives with the caller, which is what lets a
 * screen keep it in the URL or in a cache key. Everything else — the roles, the
 * pair of ids that tie a tab to its panel, the roving tab stop, and arrow-key
 * navigation — is wired in here rather than left to whoever composes it.
 */
export function Tabs({ value, onValueChange, label, className, children, ...props }: TabsProps) {
  const baseId = useId()

  const context = useMemo(
    () => ({ value, onValueChange, label, baseId }),
    [value, onValueChange, label, baseId],
  )

  return (
    <TabsContext.Provider value={context}>
      <div className={cn('flex flex-col gap-4', className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

/** Where the arrow keys land, given the key pressed and where focus is now. */
function nextIndex(key: string, current: number, count: number): number | null {
  switch (key) {
    case 'ArrowRight':
      return (current + 1) % count
    case 'ArrowLeft':
      return (current - 1 + count) % count
    case 'Home':
      return 0
    case 'End':
      return count - 1
    default:
      return null
  }
}

export function TabList({ className, onKeyDown, ...props }: TabListProps) {
  const { label } = useTabsContext()

  /**
   * The tabs are read out of the DOM rather than from a registry, so a tab strip
   * composed in any order still navigates in the order it is rendered in.
   * Moving focus also selects, which is the pattern's default for panels that
   * are cheap to show.
   */
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event)

    const tabs = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
    const current = tabs.findIndex((tab) => tab === document.activeElement)

    if (current === -1 || tabs.length === 0) {
      return
    }

    const target = nextIndex(event.key, current, tabs.length)

    if (target === null) {
      return
    }

    event.preventDefault()
    tabs[target]?.focus()
    tabs[target]?.click()
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className={cn(
        'inline-flex flex-wrap items-center gap-1 rounded-container border border-border bg-surface-inset p-1',
        className,
      )}
      {...props}
    />
  )
}

/**
 * Built on `Button` rather than beside it, so the focus ring, the disabled
 * treatment and the `type="button"` default are the same ones every other
 * control in the app uses.
 */
export function Tab({ value, className, onClick, ...props }: TabProps) {
  const { value: selected, onValueChange, baseId } = useTabsContext()
  const isSelected = selected === value

  return (
    <Button
      variant={isSelected ? 'selected' : 'ghost'}
      size="sm"
      role="tab"
      id={tabId(baseId, value)}
      aria-selected={isSelected}
      // Only the visible panel exists, so only the selected tab can point at one.
      aria-controls={isSelected ? tabPanelId(baseId, value) : undefined}
      // One tab stop for the whole strip: arrow keys move between them.
      tabIndex={isSelected ? 0 : -1}
      onClick={(event) => {
        onClick?.(event)
        onValueChange(value)
      }}
      className={className}
      {...props}
    />
  )
}

/**
 * An unselected panel is not rendered at all, rather than hidden. A panel that
 * loads its own data therefore loads it when it is first shown, instead of three
 * tabs' worth of requests going out on the first paint.
 */
export function TabPanel({ value, className, ...props }: TabPanelProps) {
  const { value: selected, baseId } = useTabsContext()

  if (selected !== value) {
    return null
  }

  return (
    <div
      role="tabpanel"
      id={tabPanelId(baseId, value)}
      aria-labelledby={tabId(baseId, value)}
      // Focusable so that a panel of unfocusable content can still be reached.
      tabIndex={0}
      // `outline-none` kills the browser's own ring on a plain focus; the
      // ring a keyboard gets is the shared one, which every other focusable
      // thing in the app uses.
      className={cn('outline-none focus-ring', className)}
      {...props}
    />
  )
}
