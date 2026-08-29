import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { MultiSelect } from './MultiSelect'
import type { SelectOption } from '../../primitives/Select'

type Plan = 'free' | 'starter' | 'pro'

const options: readonly SelectOption<Plan>[] = [
  { value: 'free', label: 'Free' },
  { value: 'starter', label: 'Starter' },
  { value: 'pro', label: 'Pro' },
]

function renderControl(value: readonly Plan[] = [], onChange = vi.fn()) {
  render(
    <MultiSelect
      label="Plan"
      options={options}
      value={value}
      onChange={onChange}
      placeholder="All plans"
    />,
  )

  return onChange
}

/** The trigger, whatever it currently says it has selected. */
function trigger(): HTMLElement {
  return screen.getByRole('button', { expanded: false }) as HTMLElement
}

describe('MultiSelect', () => {
  it('names itself with its label and what is chosen', () => {
    renderControl()

    expect(screen.getByRole('button', { name: 'Plan All plans' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  it('names the one thing chosen, and counts more than one', () => {
    const { rerender } = render(
      <MultiSelect label="Plan" options={options} value={['starter']} onChange={vi.fn()} />,
    )

    expect(screen.getByRole('button', { name: 'Plan Starter' })).toBeInTheDocument()

    rerender(
      <MultiSelect label="Plan" options={options} value={['starter', 'pro']} onChange={vi.fn()} />,
    )

    expect(screen.getByRole('button', { name: 'Plan 2 selected' })).toBeInTheDocument()
  })

  it('keeps the options hidden until the trigger is pressed', async () => {
    renderControl()

    expect(screen.queryByRole('checkbox', { name: 'Free' })).not.toBeInTheDocument()

    await userEvent.click(trigger())

    expect(screen.getByRole('group', { name: 'Plan' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Free' })).toBeInTheDocument()
    expect(screen.getByRole('button', { expanded: true })).toHaveAttribute(
      'aria-controls',
      screen.getByRole('group', { name: 'Plan' }).parentElement?.id,
    )
  })

  it('checks the options that are already chosen', async () => {
    renderControl(['pro'])

    await userEvent.click(screen.getByRole('button', { name: 'Plan Pro' }))

    expect(screen.getByRole('checkbox', { name: 'Pro' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Free' })).not.toBeChecked()
  })

  it('adds to the selection rather than replacing it', async () => {
    const onChange = renderControl(['free'])

    await userEvent.click(screen.getByRole('button', { name: 'Plan Free' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Pro' }))

    expect(onChange).toHaveBeenCalledWith(['free', 'pro'])
  })

  it('takes a chosen option back out', async () => {
    const onChange = renderControl(['free', 'pro'])

    await userEvent.click(screen.getByRole('button', { name: 'Plan 2 selected' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Free' }))

    expect(onChange).toHaveBeenCalledWith(['pro'])
  })

  it('emits in option order however the options were chosen', async () => {
    const onChange = renderControl(['pro'])

    await userEvent.click(screen.getByRole('button', { name: 'Plan Pro' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Free' }))

    // Chosen pro then free, emitted free then pro: two people filtering on the
    // same two plans ask the same question.
    expect(onChange).toHaveBeenCalledWith(['free', 'pro'])
  })

  it('clears the whole selection, and offers no way to clear an empty one', async () => {
    const onChange = renderControl(['free', 'pro'])

    await userEvent.click(screen.getByRole('button', { name: 'Plan 2 selected' }))
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }))

    expect(onChange).toHaveBeenCalledWith([])

    renderControl()
    await userEvent.click(screen.getByRole('button', { name: 'Plan All plans' }))
    expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument()
  })

  it('stays open across several choices', async () => {
    function Controlled() {
      const [value, setValue] = useState<Plan[]>([])

      return <MultiSelect label="Plan" options={options} value={value} onChange={setValue} />
    }

    render(<Controlled />)

    await userEvent.click(screen.getByRole('button', { name: 'Plan Any' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Free' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Pro' }))

    expect(screen.getByRole('button', { name: 'Plan 2 selected' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('closes on Escape and hands focus back to the trigger', async () => {
    renderControl()

    await userEvent.click(trigger())
    await userEvent.click(screen.getByRole('checkbox', { name: 'Free' }))
    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('checkbox', { name: 'Free' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Plan All plans' })).toHaveFocus()
  })

  it('closes when something else is pointed at', async () => {
    render(
      <>
        <MultiSelect label="Plan" options={options} value={[]} onChange={vi.fn()} />
        <button type="button">Elsewhere</button>
      </>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Plan Any' }))
    expect(screen.getByRole('checkbox', { name: 'Free' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Elsewhere' }))

    expect(screen.queryByRole('checkbox', { name: 'Free' })).not.toBeInTheDocument()
  })

  it('wires an error to the control and announces it', () => {
    render(
      <MultiSelect
        label="Plan"
        options={options}
        value={[]}
        onChange={vi.fn()}
        error="Choose at least one plan."
      />,
    )

    const control = screen.getByRole('button', { name: 'Plan Any' })

    expect(control).toHaveAttribute('aria-invalid', 'true')
    expect(control).toHaveAccessibleDescription('Choose at least one plan.')
    expect(screen.getByRole('alert')).toHaveTextContent('Choose at least one plan.')
  })

  it('describes the control with its hint', () => {
    render(
      <MultiSelect
        label="Plan"
        options={options}
        value={[]}
        onChange={vi.fn()}
        hint="Leave empty to see every plan."
      />,
    )

    expect(screen.getByRole('button', { name: 'Plan Any' })).toHaveAccessibleDescription(
      'Leave empty to see every plan.',
    )
  })

  it('cannot be opened while disabled', async () => {
    render(
      <MultiSelect label="Plan" options={options} value={[]} onChange={vi.fn()} disabled />,
    )

    const control = screen.getByRole('button', { name: 'Plan Any' })
    expect(control).toBeDisabled()

    await userEvent.click(control)

    expect(screen.queryByRole('checkbox', { name: 'Free' })).not.toBeInTheDocument()
  })
})
