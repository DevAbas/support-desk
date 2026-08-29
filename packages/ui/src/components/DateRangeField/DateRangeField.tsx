import { Button } from '../../primitives/Button'
import { Input } from '../../primitives/Input'
import { cn } from '@harness-sample/shared'
import type { DateRange, DateRangeFieldProps } from './DateRangeField.types'

/**
 * A date range, as a row of presets and the two dates they resolve to.
 *
 * There is no separate "custom" mode to switch into: the two date inputs are
 * always live, and editing either one simply stops matching any preset. Which
 * preset is active is therefore derived from the range rather than stored
 * beside it, so the control cannot end up highlighting a preset that no longer
 * describes the dates on screen.
 */

/** ISO dates compare chronologically as strings, so this is the whole check. */
function isSameRange(a: DateRange, b: DateRange): boolean {
  return a.from === b.from && a.to === b.to
}

/**
 * Moving one end past the other takes the other with it. A range that ends
 * before it starts is not a narrower range, it is not a range at all, and the
 * endpoints reject it — so it is never emitted.
 */
function withFrom(range: DateRange, from: string): DateRange {
  return { from, to: from > range.to ? from : range.to }
}

function withTo(range: DateRange, to: string): DateRange {
  return { from: to < range.from ? to : range.from, to }
}

export function DateRangeField({
  legend,
  value,
  presets,
  onChange,
  min,
  max,
  fromLabel = 'From',
  toLabel = 'To',
  disabled,
  className,
  ...props
}: DateRangeFieldProps) {
  const activePreset = presets.find((preset) => isSameRange(preset.range, value))

  return (
    <fieldset disabled={disabled} className={cn('flex flex-col gap-3', className)} {...props}>
      <legend className="text-body font-medium text-fg">{legend}</legend>

      <div className="flex flex-wrap items-end gap-4">
        <div role="group" aria-label={`${legend} presets`} className="flex flex-wrap gap-2">
          {presets.map((preset) => {
            const isActive = preset.id === activePreset?.id

            return (
              <Button
                key={preset.id}
                variant={isActive ? 'selected' : 'secondary'}
                size="sm"
                // A toggle, not a link: the pressed state is what tells a screen
                // reader which range is showing. The variant is what shows it.
                aria-pressed={isActive}
                onClick={() => onChange(preset.range)}
              >
                {preset.label}
              </Button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-start gap-3">
          <Input
            label={fromLabel}
            type="date"
            value={value.from}
            min={min}
            max={max}
            // An empty input is a date being retyped, not a range being cleared.
            onChange={(event) =>
              event.target.value === '' ? undefined : onChange(withFrom(value, event.target.value))
            }
          />
          <Input
            label={toLabel}
            type="date"
            value={value.to}
            min={min}
            max={max}
            onChange={(event) =>
              event.target.value === '' ? undefined : onChange(withTo(value, event.target.value))
            }
          />
        </div>
      </div>
    </fieldset>
  )
}
