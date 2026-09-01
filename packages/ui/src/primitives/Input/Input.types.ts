import type { ComponentPropsWithRef } from 'react'

/** `id` is omitted: the component generates one so the label is always bound. */
export interface InputProps extends Omit<ComponentPropsWithRef<'input'>, 'id'> {
  label: string
  /**
   * Takes the label off the screen without unbinding it.
   *
   * The `<label>` is still rendered and still `htmlFor` this control; it is only
   * `sr-only`. So the binding this component generates is what names the field
   * in both states, and there is nothing to keep in step between them.
   *
   * For a field whose whole visible chrome is its placeholder — the one in a
   * search palette — which is still a control that has to be named, because a
   * placeholder is not a name.
   *
   * `Checkbox` has a prop of this name that answers the same question the other
   * way: it renders no label element at all and names the box with `aria-label`.
   * The difference is where each label sits. A checkbox's label *wraps* the box,
   * which is what makes the words a click target, and a wrapper with nothing
   * visible inside it is not worth keeping; this one is a sibling bound by `id`,
   * which costs nothing to hide.
   */
  labelHidden?: boolean
  error?: string
  hint?: string
}
