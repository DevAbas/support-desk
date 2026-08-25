import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '@/design-system/Button'
import { cn } from '@/lib/cn'
import type { MultiSelectProps } from './MultiSelect.types'

/**
 * A filter that takes several values at once.
 *
 * It is not `Select` with `multiple` set. A native multiple select is a scrolling
 * box that has to be ctrl-clicked to add to, which almost nobody discovers, and
 * it cannot say "3 selected" without a second element next to it saying so.
 *
 * Underneath it is a group of checkboxes, because that is what choosing several
 * things out of a list is. The disclosure is only there to keep a toolbar the
 * height of one control: the trigger says what is chosen, `aria-expanded` says
 * whether the group is showing, and `aria-controls` points at it.
 *
 * Selection is controlled, like `Tabs`. The value lives with the caller, which
 * is what lets a screen put it in a cache key or a URL.
 *
 * There is no widened "all" option, and there should not be one. `Select` needs
 * `all` because a single-value filter has no way to say "do not filter"; a set
 * already has one, and it is the empty set.
 */
export function MultiSelect<TValue extends string = string>({
  label,
  options,
  value,
  onChange,
  placeholder = 'Any',
  error,
  hint,
  disabled = false,
  className,
}: MultiSelectProps<TValue>) {
  const id = useId()
  const labelId = `${id}-label`
  const summaryId = `${id}-summary`
  const panelId = `${id}-panel`
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')

  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Pointing at anything else is a way of saying you are done here. Listening on
  // mousedown rather than click means the group is gone before whatever was
  // clicked underneath it reacts.
  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      if (event.target instanceof Node && containerRef.current?.contains(event.target) !== true) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
    }
  }, [isOpen])

  const selected = options.filter((option) => value.includes(option.value))

  /**
   * What the trigger says. One choice is worth naming; several are not worth
   * the width, and the group below is where they can be read.
   */
  const summary =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? (selected[0]?.label ?? placeholder)
        : `${String(selected.length)} selected`

  /** Emitted in `options` order, so choosing the same set twice is one value. */
  function toggle(target: TValue) {
    const next = value.includes(target)
      ? value.filter((option) => option !== target)
      : [...value, target]

    onChange(options.filter((option) => next.includes(option.value)).map((option) => option.value))
  }

  function close() {
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative flex flex-col gap-1', className)}
      // Escape reaches this from the trigger and from any checkbox in the group,
      // so there is one handler rather than one per focusable thing.
      onKeyDown={(event) => {
        if (event.key === 'Escape' && isOpen) {
          event.preventDefault()
          close()
        }
      }}
    >
      <span id={labelId} className="text-sm font-medium text-fg">
        {label}
      </span>

      <Button
        ref={triggerRef}
        variant="secondary"
        aria-expanded={isOpen}
        // Only pointed at while it exists, the same way `Tab` only points at the
        // panel that is rendered: a reference to an absent id is not a reference.
        aria-controls={isOpen ? panelId : undefined}
        // The name is the label and what is currently chosen, so a screen reader
        // is told both without the two being separate stops.
        aria-labelledby={`${labelId} ${summaryId}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
        className={cn('justify-between font-normal', error && 'border-danger')}
      >
        <span id={summaryId} className={cn(selected.length === 0 && 'text-fg-muted')}>
          {summary}
        </span>
        <span aria-hidden="true" className="text-fg-subtle">
          &#9662;
        </span>
      </Button>

      {isOpen ? (
        <div
          id={panelId}
          className="absolute top-full left-0 z-20 mt-1 flex w-full min-w-48 flex-col gap-2 rounded-md border border-border bg-surface p-3 shadow-overlay"
        >
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">{label}</legend>

            {options.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 text-sm text-fg"
              >
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={value.includes(option.value)}
                  onChange={() => toggle(option.value)}
                />
                {option.label}
              </label>
            ))}
          </fieldset>

          {selected.length > 0 ? (
            <Button variant="ghost" size="sm" className="self-start" onClick={() => onChange([])}>
              Clear
            </Button>
          ) : null}
        </div>
      ) : null}

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
