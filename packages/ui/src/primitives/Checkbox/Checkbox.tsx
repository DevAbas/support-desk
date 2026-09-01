import { useEffect, useRef } from 'react'
import { cn } from '@support-desk/shared'
import type { CheckboxProps } from './Checkbox.types'

/**
 * Disabled fades the whole control rather than filling its background the way
 * `Input`, `Select` and `Textarea` do, because `accent-primary` paints the box
 * itself and a background behind it is a background nobody sees. There is no
 * focus-ring override for the same kind of reason: the box is drawn by the
 * browser, and so is the ring that fits it.
 */
const controlClasses = 'size-4 accent-primary disabled:cursor-not-allowed disabled:opacity-50'

/**
 * The visible half: the words are a click target too, not just the box.
 *
 * `interactive` because it is one — the whole label takes the click, so the
 * whole label answers the pointer. The box itself is drawn by the browser and
 * keeps its own states, the same way it keeps its own focus ring.
 */
const labelClasses = 'interactive flex cursor-pointer items-center gap-2 text-body text-fg'

/**
 * A checkbox.
 *
 * A raw checkbox input, sized and accented by hand, had been written three times
 * — twice in the ticket table, once in `MultiSelect` — which is the count at
 * which `Icon`, `Heading` and `StateMessage` were written. The three copies
 * agreed on the two classes that are easy to agree on and had nothing else: none
 * of them said what a disabled box looks like, and none could say "some of
 * these".
 *
 * `label` is required, so the control cannot be rendered unnamed. Where the
 * label would be noise on the screen — a selection column in a table, whose
 * heading and rows already say what is being selected — `labelHidden` names the
 * control without drawing the words.
 */
export function Checkbox({
  label,
  labelHidden = false,
  indeterminate = false,
  className,
  ...props
}: CheckboxProps) {
  const ref = useRef<HTMLInputElement>(null)

  // `indeterminate` has no attribute, only a property, so it is the one piece of
  // this component's state that has to be written to the node by hand.
  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate
    }
  }, [indeterminate])

  const control = (
    <input
      ref={ref}
      type="checkbox"
      // Only where nothing is drawn beside the box: with a visible label the
      // `<label>` around it is the name, and an aria-label would silently
      // replace the words on screen with these ones.
      aria-label={labelHidden ? label : undefined}
      className={cn(controlClasses, className)}
      {...props}
    />
  )

  if (labelHidden) {
    return control
  }

  return (
    <label className={labelClasses}>
      {control}
      {label}
    </label>
  )
}
