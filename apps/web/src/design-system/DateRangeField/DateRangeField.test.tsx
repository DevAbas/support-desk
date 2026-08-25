import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DateRangeField } from './DateRangeField'
import type { DateRange, DateRangePreset } from './DateRangeField.types'

const presets: readonly DateRangePreset[] = [
  { id: 'last-7', label: 'Last 7 days', range: { from: '2026-08-19', to: '2026-08-25' } },
  { id: 'last-30', label: 'Last 30 days', range: { from: '2026-07-27', to: '2026-08-25' } },
]

function renderField(value: DateRange, onChange = vi.fn()) {
  render(
    <DateRangeField legend="Date range" value={value} presets={presets} onChange={onChange} />,
  )

  return onChange
}

describe('DateRangeField', () => {
  it('names the control and its presets', () => {
    renderField({ from: '2026-08-19', to: '2026-08-25' })

    expect(screen.getByRole('group', { name: 'Date range' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Date range presets' })).toBeInTheDocument()
  })

  it('marks the preset the range matches as pressed', () => {
    renderField({ from: '2026-08-19', to: '2026-08-25' })

    expect(screen.getByRole('button', { name: 'Last 7 days' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Last 30 days' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('presses nothing when the dates match no preset', () => {
    renderField({ from: '2026-01-01', to: '2026-02-01' })

    for (const preset of presets) {
      expect(screen.getByRole('button', { name: preset.label })).toHaveAttribute(
        'aria-pressed',
        'false',
      )
    }
  })

  it('emits the preset range when one is pressed', async () => {
    const onChange = renderField({ from: '2026-08-19', to: '2026-08-25' })

    await userEvent.click(screen.getByRole('button', { name: 'Last 30 days' }))

    expect(onChange).toHaveBeenCalledWith({ from: '2026-07-27', to: '2026-08-25' })
  })

  it('shows the range in two bound date fields', () => {
    renderField({ from: '2026-08-19', to: '2026-08-25' })

    expect(screen.getByLabelText('From')).toHaveValue('2026-08-19')
    expect(screen.getByLabelText('To')).toHaveValue('2026-08-25')
  })

  // A date input takes a whole date at once rather than a keystroke at a time,
  // so these drive it the way the browser does.
  function enterDate(label: string, value: string) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } })
  }

  it('emits an edited start date', () => {
    const onChange = renderField({ from: '2026-08-19', to: '2026-08-25' })

    enterDate('From', '2026-08-01')

    expect(onChange).toHaveBeenLastCalledWith({ from: '2026-08-01', to: '2026-08-25' })
  })

  it('takes the other end with it rather than emitting an inverted range', () => {
    const onChange = renderField({ from: '2026-08-19', to: '2026-08-25' })

    enterDate('From', '2026-09-30')
    expect(onChange).toHaveBeenLastCalledWith({ from: '2026-09-30', to: '2026-09-30' })

    onChange.mockClear()

    enterDate('To', '2026-01-01')
    expect(onChange).toHaveBeenLastCalledWith({ from: '2026-01-01', to: '2026-01-01' })
  })

  it('treats an emptied field as a date being retyped, not a range being cleared', () => {
    const onChange = renderField({ from: '2026-08-19', to: '2026-08-25' })

    enterDate('From', '')

    expect(onChange).not.toHaveBeenCalled()
  })

  it('disables every control at once', () => {
    render(
      <DateRangeField
        legend="Date range"
        value={{ from: '2026-08-19', to: '2026-08-25' }}
        presets={presets}
        onChange={vi.fn()}
        disabled
      />,
    )

    expect(screen.getByRole('button', { name: 'Last 7 days' })).toBeDisabled()
    expect(screen.getByLabelText('From')).toBeDisabled()
  })
})
