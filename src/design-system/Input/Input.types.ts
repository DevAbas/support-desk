import type { ComponentPropsWithRef } from 'react'

/** `id` is omitted: the component generates one so the label is always bound. */
export interface InputProps extends Omit<ComponentPropsWithRef<'input'>, 'id'> {
  label: string
  error?: string
  hint?: string
}
