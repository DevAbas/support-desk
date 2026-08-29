import type { ComponentPropsWithRef } from 'react'

/**
 * `type` is omitted because a `Checkbox` is one; `ref` because the component
 * owns it — `indeterminate` is a DOM property with no attribute, so the only way
 * to set it is to hold the node. `aria-label` is omitted because `label` is how
 * this control is named, and two ways to name one control is one too many.
 */
export interface CheckboxProps
  extends Omit<ComponentPropsWithRef<'input'>, 'type' | 'ref' | 'aria-label' | 'children'> {
  /**
   * What ticking this box means, in words.
   *
   * Required, the way `Icon` requires a `label` and `Avatar` a `name`, so a
   * checkbox cannot be rendered without someone having decided what it says. A
   * column of unnamed boxes down the left of a table is a column of controls a
   * screen reader announces only as "checkbox".
   */
  label: string
  /**
   * Renders the label as the control's accessible name only, with nothing drawn
   * beside the box.
   *
   * For a checkbox in a table cell, where the row it sits on is the label and
   * repeating it in the cell would be a column of text nobody can read across.
   * Everywhere else the label is visible and wraps the box, so the words are a
   * click target too.
   */
  labelHidden?: boolean
  /**
   * "Some of these, not all" — the third state a checkbox over a set has.
   *
   * It is a DOM property rather than an attribute, so it is written to the node
   * rather than rendered. Native `indeterminate` already exposes the mixed state
   * to assistive technology, which is why no `aria-checked` is set on top of it:
   * an ARIA state duplicating a native one is a second thing that can disagree.
   */
  indeterminate?: boolean
}
