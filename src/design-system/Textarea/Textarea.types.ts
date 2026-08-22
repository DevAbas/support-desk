import type { ComponentPropsWithRef } from 'react'

/** `id` is omitted: the component generates one so the label is always bound. */
export interface TextareaProps extends Omit<ComponentPropsWithRef<'textarea'>, 'id'> {
  label: string
  error?: string
  hint?: string
}
