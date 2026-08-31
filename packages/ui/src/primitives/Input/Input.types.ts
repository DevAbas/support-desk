import type { ComponentPropsWithRef } from 'react'

/** `id` is omitted: the component generates one so the label is always bound. */
export interface InputProps extends Omit<ComponentPropsWithRef<'input'>, 'id'> {
  label: string
  /**
   * Keeps the label as the accessible name without drawing the words.
   *
   * The same prop `Checkbox` has, for the same reason: a field whose whole
   * visible chrome is its placeholder — the one in a search palette — is still a
   * control that has to be named, and a placeholder is not a name. It hides the
   * label rather than dropping it, so the binding this component generates is
   * the only thing naming the field either way.
   */
  labelHidden?: boolean
  error?: string
  hint?: string
}
