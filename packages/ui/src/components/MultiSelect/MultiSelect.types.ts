import type { SelectOption } from '../../primitives/Select'

/**
 * The option shape is `Select`'s. A list of values with labels is the same list
 * whether one of them can be chosen or several, and a second type for it would
 * only be a second thing to convert between.
 */
export interface MultiSelectProps<TValue extends string = string> {
  /** Names the control and the group of checkboxes inside it. */
  label: string
  options: readonly SelectOption<TValue>[]
  /** The chosen values. An empty array means nothing is filtered out. */
  value: readonly TValue[]
  /** Always in `options` order, whatever order they were chosen in. */
  onChange: (value: TValue[]) => void
  /** Shown on the trigger while nothing is chosen, e.g. "All plans". */
  placeholder?: string
  error?: string
  hint?: string
  disabled?: boolean
  className?: string
}
