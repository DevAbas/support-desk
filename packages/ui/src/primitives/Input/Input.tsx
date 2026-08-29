import { useId } from 'react'
import { cn } from '@harness-sample/shared'
import type { InputProps } from './Input.types'

const controlClasses =
  'block w-full rounded-md border bg-surface px-3 py-2 text-sm text-fg ' +
  'placeholder:text-fg-subtle focus-visible:outline-2 focus-visible:outline-offset-0 ' +
  'focus-visible:outline-primary disabled:cursor-not-allowed disabled:bg-muted'

export function Input({ label, error, hint, className, ...props }: InputProps) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn(controlClasses, error && 'border-danger', !error && 'border-border', className)}
        {...props}
      />
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
