import { useId } from 'react'
import { cn } from '@harness-sample/shared'
import type { SelectProps } from './Select.types'

const controlClasses =
  'block w-full appearance-none rounded-element border bg-surface px-2.5 py-1.5 text-body text-fg ' +
  'focus-ring-inset disabled:cursor-not-allowed disabled:bg-muted'

export function Select<TValue extends string = string>({
  label,
  options,
  error,
  hint,
  placeholder,
  className,
  ...props
}: SelectProps<TValue>) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-body font-medium text-fg">
        {label}
      </label>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn(controlClasses, error && 'border-danger', !error && 'border-border', className)}
        {...props}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? (
        <p id={hintId} className="text-caption text-fg-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
