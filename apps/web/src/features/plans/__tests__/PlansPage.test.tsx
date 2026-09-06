import { screen, waitForElementToBeRemoved, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { forwardToApi, mswServer } from '@/test/msw/server'
import { renderWithProviders } from '@/test/renderWithProviders'
import { PlansPage } from '@/features/plans/PlansPage'

/**
 * The screen is driven against the real API through MSW, the same way the
 * customer and ticket screens are, so what is asserted here is the real ladder
 * rule and the real seeded catalogue rather than a fixture agreeing with itself.
 *
 * The seed prices Free at nothing, Starter at £19, Pro at £49 and Enterprise at
 * £199, and only Enterprise has no seat limit. Those are fixed properties of
 * `planSeed.ts` and not figures read back off the code under test.
 */
async function renderPlans() {
  renderWithProviders(<PlansPage />, { initialEntries: ['/plans'], role: 'admin' })
  await waitForElementToBeRemoved(() => screen.queryByText('Loading plans…'))
}

/** One row of the catalogue, by the plan it is for. */
function planRow(plan: string): HTMLElement {
  const cell = screen.getByRole('cell', { name: plan })
  const row = cell.closest('tr')

  expect(row).not.toBeNull()

  return row as HTMLElement
}

const dialog = () => screen.getByRole('dialog', { name: /^Edit / })

const priceField = () => screen.getByLabelText('Price per month')

const seatsField = () => screen.getByLabelText('Seat limit')

async function openEditor(plan: string) {
  await userEvent.click(within(planRow(plan)).getByRole('button', { name: `Edit ${plan}` }))
}

/** Replaces what a field holds, rather than appending to it. */
async function retype(field: HTMLElement, value: string) {
  await userEvent.clear(field)
  await userEvent.type(field, value)
}

describe('PlansPage', () => {
  it('shows a loading state and then every plan, in domain order', async () => {
    renderWithProviders(<PlansPage />, { initialEntries: ['/plans'], role: 'admin' })

    expect(screen.getByText('Loading plans…')).toBeInTheDocument()

    await waitForElementToBeRemoved(() => screen.queryByText('Loading plans…'))

    // The plans are a closed union, so the whole catalogue arrives at once:
    // there is no load-more and no page to turn.
    const rows = screen.getAllByRole('row').slice(1)
    expect(rows).toHaveLength(4)
    expect(rows.map((row) => within(row).getAllByRole('cell')[0]?.textContent)).toEqual([
      'Free',
      'Starter',
      'Pro',
      'Enterprise',
    ])
  })

  it('draws a whole price without a decimal point on it, and pence with one', async () => {
    await renderPlans()

    expect(within(planRow('Starter')).getByText('£19')).toBeInTheDocument()
    expect(within(planRow('Free')).getByText('£0')).toBeInTheDocument()

    await openEditor('Starter')
    await retype(priceField(), '19.99')
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Save plan' }))

    expect(await within(planRow('Starter')).findByText('£19.99')).toBeInTheDocument()
  })

  it('says a plan carries no seat limit rather than drawing a large number', async () => {
    await renderPlans()

    expect(within(planRow('Enterprise')).getByText('Unlimited')).toBeInTheDocument()
    expect(within(planRow('Pro')).getByText('50')).toBeInTheDocument()
  })

  it('counts the customers on each plan, and accounts for every one of them', async () => {
    await renderPlans()

    // The join between this screen and the customer list, and the whole of it:
    // nothing here fetches a customer.
    expect(within(planRow('Enterprise')).getByText('5')).toBeInTheDocument()
    expect(within(planRow('Pro')).getByText('9')).toBeInTheDocument()
  })

  it('opens the editor on the plan whose row was clicked', async () => {
    await renderPlans()

    await openEditor('Pro')

    expect(dialog()).toHaveAccessibleName('Edit Pro')
    // Seeded from the row rather than blank, so an edit is a change to what is
    // there and not a form somebody has to fill in again.
    expect(priceField()).toHaveValue('49')
    expect(seatsField()).toHaveValue('50')
  })

  it('saves a new price and shows it on the row', async () => {
    await renderPlans()

    await openEditor('Pro')
    await retype(priceField(), '59')
    await retype(screen.getByLabelText('Who it is for'), 'Reporting and bulk actions.')
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Save plan' }))

    expect(await within(planRow('Pro')).findByText('£59')).toBeInTheDocument()
    expect(within(planRow('Pro')).getByText('Reporting and bulk actions.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('takes the seat limit off a plan entirely', async () => {
    await renderPlans()

    await openEditor('Pro')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Unlimited seats' }))

    // The field is disabled rather than removed, so ticking the box back off
    // does not mean typing the number again.
    expect(seatsField()).toBeDisabled()

    await userEvent.click(within(dialog()).getByRole('button', { name: 'Save plan' }))

    expect(await within(planRow('Pro')).findByText('Unlimited')).toBeInTheDocument()
  })

  it('says which pair is out of order when the ladder refuses an edit', async () => {
    await renderPlans()

    await openEditor('Pro')
    await retype(priceField(), '1')
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Save plan' }))

    // The server's own sentence, naming both rungs: whether Pro sits correctly
    // against Starter is a fact about a plan this dialog is not showing, so the
    // screen does not compute an answer of its own.
    const alert = await within(dialog()).findByRole('alert')
    expect(alert).toHaveTextContent('Pro cannot cost less than Starter')

    // Reported inside the dialog, which is `aria-modal` — a band over the table
    // behind it is a message a screen reader is told is not there.
    expect(dialog()).toContainElement(alert)
    expect(within(planRow('Pro')).getByText('£49')).toBeInTheDocument()
  })

  it('says what is wrong with a price before asking the server about it', async () => {
    let requests = 0
    mswServer.use(
      http.patch('/api/plans/:plan', ({ request }) => {
        requests += 1
        return forwardToApi(request)
      }),
    )

    await renderPlans()

    await openEditor('Pro')
    await retype(priceField(), 'forty nine')
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Save plan' }))

    expect(priceField()).toHaveAccessibleDescription(/A price in pounds/)
    // Whether that is a price is a question about what was typed, so the round
    // trip is not made at all.
    expect(requests).toBe(0)
  })

  it('refuses a seat count that is not a whole number of seats', async () => {
    await renderPlans()

    await openEditor('Pro')
    await retype(seatsField(), '12.5')
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Save plan' }))

    expect(seatsField()).toHaveAccessibleDescription(/A whole number of seats/)
  })

  it('refuses to leave a plan with nothing said about it', async () => {
    await renderPlans()

    await openEditor('Pro')
    await userEvent.clear(screen.getByLabelText('Who it is for'))
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Save plan' }))

    expect(screen.getByLabelText('Who it is for')).toHaveAccessibleDescription(/Say who the plan/)
  })

  it('starts from a clean question when the editor is opened again', async () => {
    await renderPlans()

    await openEditor('Pro')
    await retype(priceField(), '1')
    await userEvent.click(within(dialog()).getByRole('button', { name: 'Save plan' }))
    await within(dialog()).findByRole('alert')

    await userEvent.click(within(dialog()).getByRole('button', { name: 'Cancel' }))
    await openEditor('Pro')

    // Neither the refusal nor the figure that caused it survives: a mutation
    // holds its error until something asks for it to be let go, and the fields
    // are re-seeded because the dialog is mounted only while it is open.
    expect(within(dialog()).queryByRole('alert')).not.toBeInTheDocument()
    expect(priceField()).toHaveValue('49')
  })

  it('reports a catalogue it could not load, and offers the way back', async () => {
    mswServer.use(http.get('/api/plans', () => HttpResponse.error()))

    renderWithProviders(<PlansPage />, { initialEntries: ['/plans'], role: 'admin' })

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the server.')

    mswServer.use(http.get('/api/plans', ({ request }) => forwardToApi(request)))
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('£199')).toBeInTheDocument()
  })
})
