import { Card } from '@/design-system/Card'
import { cn } from '@/lib/cn'
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
const directionGlyph: Record<StatChangeDirection, string> = {
  up: '↑',
  down: '↓',
  flat: '→',
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
  loadingMessage = 'Loading…',
  className,
  ...props
}: StatCardProps) {
  return (
    <Card className={cn('flex flex-col gap-2 px-5 py-4', className)} {...props}>
      <p className="text-sm font-medium text-fg-muted">{label}</p>

      {isLoading ? (
        <p role="status" aria-live="polite" className="text-sm text-fg-muted">
          {loadingMessage}
        </p>
      ) : (
        <>
          <p className="text-2xl font-semibold text-fg">{value}</p>

          {change ? (
            <p className={cn('flex flex-wrap items-baseline gap-1 text-xs', intentClasses[change.intent ?? 'neutral'])}>
              <span aria-hidden="true">{directionGlyph[change.direction]}</span>
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
