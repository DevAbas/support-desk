import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { SEED_ADMIN_EMAIL, SEED_AGENT_EMAIL } from '@support-desk/api/userSeed'
import { forwardToApi, mswServer, signInTestUser } from '@/test/msw/server'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { Role } from '@/features/roles/role.types'
import { GlobalSearch } from '@/features/search/GlobalSearch'
import { CurrentLocation } from './CurrentLocation'

/**
 * The search, driven against the real API through MSW like every other screen
 * here — so what is asserted is the real matching, the real grouping and the
 * real role gate rather than a fixture agreeing with itself.
 *
 * `CurrentLocation` is rendered beside it because picking a result is a
 * navigation and nothing else, so where it went is what most of these cases are
 * about. The one that needs more than an address — a customer, whose drawer is
 * not a route — is proved on the customer screen, which is what reads it.
 *
 * **Nothing here waits on "not loading".** The palette keeps the previous answer
 * on screen while the next one is on its way, which is the whole reason it does
 * not blank between keystrokes — so the absence of a spinner is not the same as
 * the results being the ones for the term just typed. Every assertion waits for
 * what it is actually about.
 */

function renderSearch(role: Role = 'admin') {
  return renderWithProviders(
    <>
      <GlobalSearch />
      <CurrentLocation />
    </>,
    { role, initialEntries: ['/tickets'] },
  )
}

/** Where the router ended up, as the probe rendered beside the palette says. */
const currentLocation = () => screen.getByTestId('location').textContent ?? ''

const palette = () => screen.getByRole('dialog', { name: 'Search' })

const field = () => screen.getByRole('combobox', { name: 'Search' })

const options = () => within(palette()).queryAllByRole('option')

/** A group heading without the "5 of 8" beside it. */
function groupNames(): string[] {
  return within(palette())
    .queryAllByRole('group')
    .map((group) => (group.firstElementChild?.textContent ?? '').replace(/\d.*$/, ''))
}

/**
 * Opens the palette as one role, at both ends of it.
 *
 * A role is two things here and they have to agree: the client decides what the
 * empty palette offers, and the server decides what a search finds. Setting only
 * the first would test an admin's results under an agent's nav, which is nobody.
 */
async function openSearch(role: Role = 'admin') {
  signInTestUser(role === 'admin' ? SEED_ADMIN_EMAIL : SEED_AGENT_EMAIL)
  renderSearch(role)
  await userEvent.click(screen.getByRole('button', { name: /Search/ }))
}

/** Waits until what is on screen is the answer to the term just typed. */
async function expectGroups(expected: string[]): Promise<void> {
  await waitFor(() => {
    expect(groupNames()).toEqual(expected)
  })
}

describe('reaching the search', () => {
  it('opens from the control in the header', async () => {
    renderSearch()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Search/ }))

    expect(palette()).toBeInTheDocument()
    expect(field()).toHaveFocus()
  })

  it('opens from the keyboard with nothing focused', async () => {
    renderSearch()

    await userEvent.keyboard('{Control>}k{/Control}')

    expect(palette()).toBeInTheDocument()
  })

  it('opens from the keyboard on the other modifier too', async () => {
    renderSearch()

    await userEvent.keyboard('{Meta>}k{/Meta}')

    expect(palette()).toBeInTheDocument()
  })

  it('closes on Escape and comes back to an empty question', async () => {
    await openSearch()
    await userEvent.type(field(), 'invoice')
    await expectGroups(['Tickets'])

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Search/ }))

    expect(field()).toHaveValue('')
  })

  it('does not answer the reopened palette with the search it was closed on', async () => {
    await openSearch()
    await userEvent.type(field(), 'Northwind')
    await expectGroups(['Customers'])
    expect(options()).toHaveLength(3)

    await userEvent.keyboard('{Escape}')
    await userEvent.click(screen.getByRole('button', { name: /Search/ }))

    // One letter, and the debounce behind the field has not settled yet. What
    // the query is still holding at this moment is the answer to the search that
    // was just dismissed: it is not an answer to this question, so it is not on
    // screen — and, since Enter opens whatever is on screen, not reachable.
    await userEvent.type(field(), 'z')

    expect(within(palette()).queryByRole('option', { name: /Northwind/ })).not.toBeInTheDocument()
    expect(options()).toHaveLength(0)
    expect(within(palette()).getByText('Searching…')).toBeInTheDocument()
  })
})

describe('with nothing typed', () => {
  it('offers the screens, rather than nothing at all', async () => {
    await openSearch()

    expect(groupNames()).toEqual(['Go to'])
    expect(options()).toHaveLength(5)

    for (const label of ['Tickets', 'New ticket', 'Customers', 'Plans', 'Reports']) {
      expect(
        within(palette()).getByRole('option', { name: new RegExp(`^${label}`) }),
      ).toBeInTheDocument()
    }
  })

  it('asks the server for nothing, because nothing has been asked', async () => {
    let requests = 0
    mswServer.use(
      http.get('/api/search', ({ request }) => {
        requests += 1
        return forwardToApi(request)
      }),
    )

    await openSearch()

    expect(requests).toBe(0)
  })
})

describe('what it finds', () => {
  it('finds a ticket by its id and goes to it', async () => {
    await openSearch()
    await userEvent.type(field(), 'TCK-0007')

    await userEvent.click(await within(palette()).findByRole('option', { name: /TCK-0007/ }))

    expect(currentLocation()).toBe('/tickets/TCK-0007')
  })

  it('finds a ticket by who it is on, which the ticket filter cannot', async () => {
    await openSearch()
    await userEvent.type(field(), 'Priya')

    // Five of the eight she has: the palette is for reaching one thing, and the
    // heading says how much of the answer it is not showing.
    expect(await within(palette()).findByText('5 of 8')).toBeInTheDocument()
  })

  it('groups what it found, most likely nearest the top', async () => {
    await openSearch()
    await userEvent.type(field(), 'Priya')

    // Tickets before customers: the queue is where the day is spent.
    await expectGroups(['Tickets', 'Customers'])
  })

  it('finds a customer by their company', async () => {
    await openSearch()
    await userEvent.type(field(), 'Northwind')

    await expectGroups(['Customers'])
    expect(options()).toHaveLength(3)
  })

  it('sends you to a customer by naming them in the address', async () => {
    await openSearch()
    await userEvent.type(field(), 'priya.raman@northwindlabs.example')

    await userEvent.click(await within(palette()).findByRole('option', { name: /Priya Raman/ }))

    // The customer drawer is not a route, so the list is where a customer is
    // reached and the address is how it is told which one.
    expect(currentLocation()).toBe('/customers?customer=CUS-0001')
  })

  it('finds a screen by a word nobody wrote on it', async () => {
    await openSearch()
    await userEvent.type(field(), 'inbox')

    await expectGroups(['Go to'])
    await userEvent.click(within(palette()).getByRole('option', { name: /^Tickets/ }))

    expect(currentLocation()).toBe('/tickets')
  })

  it('says nothing matched, and offers no way to act on it', async () => {
    await openSearch()
    await userEvent.type(field(), 'zzzznothinghere')

    expect(
      await within(palette()).findByText('Nothing matches "zzzznothinghere".'),
    ).toBeInTheDocument()
    expect(options()).toHaveLength(0)
  })

  it('reports a failure inside the palette rather than behind it', async () => {
    mswServer.use(http.get('/api/search', () => HttpResponse.error()))

    await openSearch()
    await userEvent.type(field(), 'invoice')

    expect(await within(palette()).findByRole('alert')).toHaveTextContent(
      'Could not reach the server.',
    )
    expect(within(palette()).queryByText(/Nothing matches/)).not.toBeInTheDocument()
  })
})

describe('the keyboard, once it is open', () => {
  it('walks the results and opens the one it is on', async () => {
    await openSearch()
    await userEvent.type(field(), 'TCK-000')

    // Nine ids match and five are served, newest first.
    await waitFor(() => {
      expect(options()).toHaveLength(5)
    })

    await userEvent.keyboard('{ArrowDown}{Enter}')

    // The second, not the first: the arrow moved before Enter opened.
    expect(currentLocation()).toBe('/tickets/TCK-0008')
  })

  it('keeps typing working while the arrow keys move', async () => {
    await openSearch()
    await userEvent.type(field(), 'TCK-000')

    await waitFor(() => {
      expect(options()).toHaveLength(5)
    })

    await userEvent.keyboard('{ArrowDown}')

    // Focus never leaves the field: the arrow keys move a pointer into the list
    // rather than moving focus into it, which is what keeps the next letter a
    // letter.
    expect(field()).toHaveFocus()

    await userEvent.type(field(), '1')
    expect(field()).toHaveValue('TCK-0001')
  })
})

describe('one request per pause, not per keystroke', () => {
  it('asks once for a word that was typed a letter at a time', async () => {
    let requests = 0
    mswServer.use(
      http.get('/api/search', ({ request }) => {
        requests += 1
        return forwardToApi(request)
      }),
    )

    await openSearch()
    await userEvent.type(field(), 'invoice')
    await expectGroups(['Tickets'])

    // Seven characters, one question. The field stays instant; only what it
    // drives waits for a pause.
    expect(requests).toBe(1)
  })
})

describe('an agent and an admin do not see the same results', () => {
  it('does not offer an agent a screen they cannot reach', async () => {
    await openSearch('agent')

    // Three of the five, and the two that are missing are the two gated in
    // `NAVIGATION_TARGETS`: the reports, which are a view of the agents, and the
    // plans, which are what the business charges.
    expect(options()).toHaveLength(3)
    expect(within(palette()).queryByRole('option', { name: /^Reports/ })).not.toBeInTheDocument()
    expect(within(palette()).queryByRole('option', { name: /^Plans/ })).not.toBeInTheDocument()
  })

  it('offers an admin the same screen', async () => {
    await openSearch('admin')

    expect(within(palette()).getByRole('option', { name: /^Reports/ })).toBeInTheDocument()
  })

  it('finds nothing for an agent searching for it by name', async () => {
    await openSearch('agent')
    await userEvent.type(field(), 'reports')

    // A ticket mentions the word, and there is no screen behind it for them.
    await expectGroups(['Tickets'])
  })

  it('finds it for an admin searching the same word', async () => {
    await openSearch('admin')
    await userEvent.type(field(), 'reports')

    await expectGroups(['Tickets', 'Go to'])
    expect(within(palette()).getByRole('option', { name: /^Reports/ })).toBeInTheDocument()
  })
})
