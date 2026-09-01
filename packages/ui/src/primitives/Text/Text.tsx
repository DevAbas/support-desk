import { cn } from '@support-desk/shared'
import type { TextProps, TextSize, TextTone } from './Text.types'

/**
 * Text wraps anywhere it has to.
 *
 * `overflow-wrap: anywhere`, not `break-word`. The two look identical until the
 * text is inside a grid or flex item, where `min-width: auto` resolves to the
 * min-content width: `break-word` leaves min-content as the longest unbroken
 * run, so one long URL in a ticket description pushes the whole column — and the
 * layout beside it — off the page. `anywhere` shrinks min-content too, which is
 * the difference between wrapping and merely being allowed to wrap.
 */
const baseClasses = 'wrap-anywhere'

// Keyed by the unions, so adding a size or tone without styling it is an error.
const sizeClasses: Record<TextSize, string> = {
  body: 'text-body',
  caption: 'text-caption',
}

const toneClasses: Record<TextTone, string> = {
  default: 'text-fg',
  muted: 'text-fg-muted',
  subtle: 'text-fg-subtle',
}

export function Text({
  size = 'body',
  tone = 'default',
  as: Element = 'p',
  className,
  ...props
}: TextProps) {
  return <Element className={cn(baseClasses, sizeClasses[size], toneClasses[tone], className)} {...props} />
}
