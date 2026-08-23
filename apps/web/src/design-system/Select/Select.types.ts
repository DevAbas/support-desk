import type { ComponentPropsWithRef } from 'react'

export interface SelectOption<TValue extends string = string> {
  value: TValue
  label: string
}

/** `id` is omitted: the component generates one so the label is always bound. */
export interface SelectProps<TValue extends string = string>
  extends Omit<ComponentPropsWithRef<'select'>, 'id' | 'children'> {
  label: string
  options: readonly SelectOption<TValue>[]
  error?: string
  hint?: string
  placeholder?: string
}
