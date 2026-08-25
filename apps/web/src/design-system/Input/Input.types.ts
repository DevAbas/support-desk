import type { ComponentPropsWithRef } from 'react'

/** `id` is omitted: the component generates one so the label is always bound. */
export interface InputProps extends Omit<ComponentPropsWithRef<'input'>, 'id'> {
  label: string
  /**
   * Hides the label visually while keeping it bound to the control, for a field
   * in a table row where the column header already names it. The label is still
   * the control's accessible name — this is never a way to have no label.
   */
  labelHidden?: boolean
  error?: string
  hint?: string
}
