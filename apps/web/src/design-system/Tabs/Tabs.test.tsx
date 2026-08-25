import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Tab, TabList, TabPanel, Tabs } from './Tabs'

function TestTabs({ onValueChange }: { onValueChange?: (value: string) => void }) {
  const [value, setValue] = useState('status')

  return (
    <Tabs
      value={value}
      label="Report views"
      onValueChange={(next) => {
        setValue(next)
        onValueChange?.(next)
      }}
    >
      <TabList>
        <Tab value="status">By status</Tab>
        <Tab value="priority">By priority</Tab>
        <Tab value="assignee">By assignee</Tab>
      </TabList>
      <TabPanel value="status">Status panel</TabPanel>
      <TabPanel value="priority">Priority panel</TabPanel>
      <TabPanel value="assignee">Assignee panel</TabPanel>
    </Tabs>
  )
}

describe('Tabs', () => {
  it('names the tab strip and marks the selected tab', () => {
    render(<TestTabs />)

    expect(screen.getByRole('tablist', { name: 'Report views' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'By status' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'By priority' })).toHaveAttribute(
      'aria-selected',
      'false',
    )
  })

  it('renders only the selected panel, labelled by its tab', () => {
    render(<TestTabs />)

    const panel = screen.getByRole('tabpanel')

    expect(panel).toHaveTextContent('Status panel')
    expect(panel).toHaveAccessibleName('By status')
    expect(screen.queryByText('Priority panel')).not.toBeInTheDocument()
  })

  it('ties the selected tab to its panel', () => {
    render(<TestTabs />)

    expect(screen.getByRole('tab', { name: 'By status' })).toHaveAttribute(
      'aria-controls',
      screen.getByRole('tabpanel').id,
    )
  })

  it('switches panel when a tab is clicked', async () => {
    const onValueChange = vi.fn()
    render(<TestTabs onValueChange={onValueChange} />)

    await userEvent.click(screen.getByRole('tab', { name: 'By assignee' }))

    expect(onValueChange).toHaveBeenCalledWith('assignee')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Assignee panel')
  })

  it('keeps one tab stop for the strip', () => {
    render(<TestTabs />)

    expect(screen.getByRole('tab', { name: 'By status' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: 'By priority' })).toHaveAttribute('tabindex', '-1')
  })

  it('moves between tabs with the arrow keys, wrapping at both ends', async () => {
    render(<TestTabs />)

    await userEvent.tab()
    expect(screen.getByRole('tab', { name: 'By status' })).toHaveFocus()

    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'By priority' })).toHaveFocus()
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Priority panel')

    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'By assignee' })).toHaveFocus()

    await userEvent.keyboard('{Home}')
    expect(screen.getByRole('tab', { name: 'By status' })).toHaveFocus()

    await userEvent.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'By assignee' })).toHaveFocus()
  })

  it('throws when a tab is rendered outside Tabs', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<Tab value="status">By status</Tab>)).toThrow(
      'Tab, TabList and TabPanel must be used inside Tabs.',
    )

    consoleError.mockRestore()
  })
})
