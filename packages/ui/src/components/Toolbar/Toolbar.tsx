import { cn } from '@support-desk/shared'
import type { ToolbarDivider, ToolbarProps } from './Toolbar.types'

/**
 * The strip scale, which is not the card scale.
 *
 * `CardBody` pads to the card scale because a card holds content and content
 * wants room. A strip holds controls, and a control brings its own height — so a
 * strip is padded to the tighter scale a table cell uses, and the two numbers are
 * different on purpose.
 */
const baseClasses = 'flex flex-wrap items-center gap-4 px-3 py-2'

// Keyed by the union, so adding an edge without styling it is a type error.
const dividerClasses: Record<ToolbarDivider, string> = {
  top: 'border-t border-border',
  bottom: 'border-b border-border',
  none: '',
}

/**
 * A strip of controls across a card.
 *
 * `CardBody` owns the card's padding and nothing owned a strip's, so six call
 * sites in feature code wrote `px-4 py-3` under a border by hand. A density pass
 * that moved that one number by one step edited thirteen lines across nine
 * files; six of those thirteen were this, in six different features, and none of
 * them could be reached from `tokens.css`. This is the thing a token can reach.
 *
 * What it is, and therefore what belongs in it: a strip sits above, below or
 * inside a card, it carries controls rather than content, and it owns its own
 * padding and its own divider. The filters over a list, the bar that appears
 * when rows are selected, the pagination under a table, the load-more at the end
 * of one. Not a `CardHeader`, which says what a card *is* — it renders a heading,
 * requires a title to put in it, and pads to the card scale. A header says what
 * a card is; a toolbar acts on it.
 *
 * Three decisions, and no more. The padding and the divider are the strip's; the
 * arrangement of the caller's own children is the caller's, and it is said in
 * `className` in the design system's own vocabulary — `justify-between`,
 * `items-end` where the strip holds labelled fields whose boxes are taller than
 * the buttons beside them, `bg-primary-subtle` where the strip appeared because
 * something is selected. Those are not classes reassembled out of this
 * component; they are one class each, saying what the caller wanted, and `cn()`
 * resolves them against the defaults here.
 *
 * It wraps. Every strip in the product wraps except the pagination, which did
 * not because nobody said it should — two groups on one line with `justify-
 * between` cramp rather than stack on a narrow viewport, and stacking is what
 * the five strips beside it already do.
 */
export function Toolbar({
  divider = 'bottom',
  as: Element = 'div',
  className,
  ...props
}: ToolbarProps) {
  return <Element className={cn(baseClasses, dividerClasses[divider], className)} {...props} />
}
