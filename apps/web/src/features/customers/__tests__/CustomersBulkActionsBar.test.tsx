import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { CustomersBulkActionsBar } from '@/features/customers/components/CustomersBulkActionsBar'

/**
 * The bar on its own, because the one thing here the page cannot show is a
 * selection larger than a bulk request may carry: it takes five hundred rows to
 * reach, and the seed holds sixty.
 */
const props = {
  selectedCount: 1,
  loadedCount: 20,
  maxBulkIds: 500,
  onSelectAll: () => undefined,
  onDeselectAll: () => undefined,
  onClearSelection: () => undefined,
  onApplyPlan: () => undefined,
  onDelete: () => undefined,
}

describe('CustomersBulkActionsBar', () => {
  it('says how many it will tick', () => {
    render(<CustomersBulkActionsBar {...props} />)

    expect(screen.getByRole('checkbox', { name: 'Select all 20' })).toBeInTheDocument()
  })

  it('promises no more than one request may carry', () => {
    render(<CustomersBulkActionsBar {...props} selectedCount={100} loadedCount={600} />)

    // Six hundred loaded, five hundred in a bulk body. A control offering the
    // six hundred would tick five hundred and then look broken when it is
    // pressed again.
    expect(screen.getByRole('checkbox', { name: 'Select all 500' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Select all 500' })).toBePartiallyChecked()
  })

  it('is ticked once it holds everything it can promise', () => {
    render(<CustomersBulkActionsBar {...props} selectedCount={500} loadedCount={600} />)

    expect(screen.getByRole('checkbox', { name: 'Select all 500' })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Delete selected' })).toBeEnabled()
  })

  it('leaves the shouting to the destructive action', () => {
    render(<CustomersBulkActionsBar {...props} />)

    // One emphasis to a strip, and of these two it belongs to the one that
    // destroys data. Apply defaults to `primary` if nobody says otherwise.
    expect(screen.getByRole('button', { name: 'Apply' })).toHaveClass('bg-surface')
    expect(screen.getByRole('button', { name: 'Delete selected' })).toHaveClass('bg-danger')
  })

  it('refuses to send more than a request may carry', async () => {
    render(<CustomersBulkActionsBar {...props} selectedCount={501} loadedCount={600} />)

    // Reachable by hand, one tick at a time, past what select-all will promise.
    // Refused here rather than parsed into a ZodError on the way out.
    expect(screen.getByRole('status')).toHaveTextContent(
      'One action takes at most 500 customers at a time.',
    )
    expect(screen.getByRole('button', { name: 'Delete selected' })).toBeDisabled()

    await userEvent.selectOptions(screen.getByLabelText('Set plan to'), 'pro')
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled()
  })
})
