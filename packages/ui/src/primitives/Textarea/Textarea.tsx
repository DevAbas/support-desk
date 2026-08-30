import { useId } from 'react'
import { cn } from '@harness-sample/shared'
import type { TextareaProps } from './Textarea.types'

const controlClasses =
  'block w-full rounded-element border bg-surface px-3 py-2 text-body text-fg ' +
  'placeholder:text-fg-subtle focus-ring-inset disabled:cursor-not-allowed disabled:bg-muted'

export function Textarea({ label, error, hint, rows = 4, className, ...props }: TextareaProps) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-body font-medium text-fg">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn(controlClasses, error && 'border-danger', !error && 'border-border', className)}
        {...props}
      />
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
