import type { ComponentPropsWithRef } from 'react'

export interface SelectOption<TValue extends string = string> {
  value: TValue
  label: string
}

/** `id` is omitted: the component generates one so the label is always bound. */
export interface SelectProps<TValue extends string = string>
  extends Omit<ComponentPropsWithRef<'select'>, 'id' | 'children'> {
  label: string
  /**
   * Hides the label visually while keeping it bound to the control, for a field
   * in a table row where the column header already names it. The label is still
   * the control's accessible name — this is never a way to have no label.
   */
  labelHidden?: boolean
  options: readonly SelectOption<TValue>[]
  error?: string
  hint?: string
  placeholder?: string
}
