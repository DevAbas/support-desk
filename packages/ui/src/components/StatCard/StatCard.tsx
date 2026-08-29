import { Card } from '../Card'
import { cn } from '@harness-sample/shared'
import { Icon, type IconName } from '../../primitives/Icon'
import { LOADING_MESSAGE, StateMessage } from '../../primitives/StateMessage'
import type { StatCardProps, StatChangeDirection, StatChangeIntent } from './StatCard.types'

const intentClasses: Record<StatChangeIntent, string> = {
  positive: 'text-success-subtle-fg',
  negative: 'text-danger-subtle-fg',
  neutral: 'text-fg-muted',
}

/**
 * The arrow is decorative and hidden from assistive technology; the word beside
 * it is what gets read out. A direction conveyed by a glyph alone would be a
 * direction conveyed by shape alone.
 */
const directionIcon: Record<StatChangeDirection, IconName> = {
  up: 'arrow-up',
  down: 'arrow-down',
  flat: 'arrow-right',
}

const directionWord: Record<StatChangeDirection, string> = {
  up: 'Up',
  down: 'Down',
  flat: 'Unchanged,',
}

/**
 * One figure, what it counts, and how it moved.
 *
 * The value is rendered inside the label's own element, so a screen reader
 * reaching the figure is told what it counts rather than reading out a bare
 * number — which is the whole risk with a wall of large numerals.
 */
export function StatCard({
  label,
  value,
  change,
  isLoading = false,
  loadingMessage = LOADING_MESSAGE,
  className,
  ...props
}: StatCardProps) {
  return (
    <Card className={cn('flex flex-col gap-2 px-5 py-4', className)} {...props}>
      <p className="text-body font-medium text-fg-muted">{label}</p>

      {isLoading ? (
        // The same message every table, list and chart shows, in the space a
        // stat has for it: a figure is one line, not a panel.
        <StateMessage isLoading className="px-0 py-0 text-left">
          {loadingMessage}
        </StateMessage>
      ) : (
        <>
          <p className="text-title text-fg">{value}</p>

          {change ? (
            <p className={cn('flex flex-wrap items-baseline gap-1 text-caption', intentClasses[change.intent ?? 'neutral'])}>
              <Icon
                name={directionIcon[change.direction]}
                size="sm"
                label={directionWord[change.direction]}
                decorative
              />
              <span className="sr-only">{directionWord[change.direction]}</span>
              <span className="font-medium">{change.label}</span>
              {change.description ? (
                <span className="text-fg-muted">{change.description}</span>
              ) : null}
            </p>
          ) : null}
        </>
      )}
    </Card>
  )
}
