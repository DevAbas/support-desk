import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Select } from './Select'

const options = [
  { value: 'low', label: 'Low' },
  { value: 'high', label: 'High' },
] as const

describe('Select', () => {
  it('renders every option under a bound label', () => {
    render(<Select label="Priority" options={options} defaultValue="low" />)

    expect(screen.getByLabelText('Priority')).toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(2)
  })

  it('renders a placeholder option when one is given', () => {
    render(<Select label="Priority" options={options} placeholder="Choose a priority" />)

    expect(screen.getByRole('option', { name: 'Choose a priority' })).toBeInTheDocument()
  })

  it('lets the user pick a value', async () => {
    render(<Select label="Priority" options={options} defaultValue="low" />)

    await userEvent.selectOptions(screen.getByLabelText('Priority'), 'high')

    expect(screen.getByLabelText('Priority')).toHaveValue('high')
  })
})
