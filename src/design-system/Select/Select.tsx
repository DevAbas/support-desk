import { useId } from 'react'
import { cn } from '../../lib/cn'
import type { SelectProps } from './Select.types'

const controlClasses =
  'block w-full appearance-none rounded-md border bg-surface px-3 py-2 text-sm text-fg ' +
  'focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary ' +
  'disabled:cursor-not-allowed disabled:bg-muted'

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
      <label htmlFor={id} className="text-sm font-medium text-fg">
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
        <p id={hintId} className="text-xs text-fg-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
