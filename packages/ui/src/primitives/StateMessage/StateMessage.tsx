import { cn } from '@harness-sample/shared'
import type { StateMessageProps } from './StateMessage.types'

const baseClasses = 'px-4 py-12 text-center text-body text-fg-muted'

/**
 * What a table, a list or a chart shows instead of its contents.
 *
 * There is one of these rather than one per component, because the version that
 * gets written inline is always the version that forgets the live region — and a
 * wait nobody is told about is not a loading state, it is a blank screen with a
 * sentence on it.
 */
export const LOADING_MESSAGE = 'Loading…'

export const EMPTY_MESSAGE = 'Nothing to show.'

export function StateMessage({ isLoading = false, className, children, ...props }: StateMessageProps) {
  return (
    <div className={cn(baseClasses, className)} {...props}>
      {isLoading ? (
        <span role="status" aria-live="polite">
          {children}
        </span>
      ) : (
        children
      )}
    </div>
  )
}
