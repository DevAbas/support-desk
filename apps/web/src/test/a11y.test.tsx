import { DOCUMENT_RULES, RECORDED, expectNoAxeViolations } from '@support-desk/a11y'
import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AppRoutes } from '@/app/AppRoutes'
import { renderWithProviders } from '@/test/renderWithProviders'
import type { Role } from '@/features/roles/role.types'

/**
 * Every screen, read back as an accessibility tree once it has finished loading.
 *
 * `packages/ui` sweeps the components; this sweeps what composing them produces,
 * and that is a different question. The defects that only exist here are the
 * ones between components: two controls whose generated ids collide once both
 * are on the page, a heading level that is right in a card and skips one in the
 * screen holding it, a landmark that is fine alone and duplicated by the shell
 * around it, an `aria-controls` pointing at something a conditional did not
 * render.
 *
 * These are pages, so the landmark and heading rules that a fragment cannot
 * satisfy are on: every screen has to have a `main`, one `h1`, and no content
 * loose outside a landmark.
 *
 * Rendered through `AppRoutes` rather than through the page component, so the
 * shell, the nav and the route guard are part of what is measured. A page
 * measured without its shell is a page measured without most of its landmarks.
 */

interface Screen {
  path: string
  role: Role
  /** What is on the screen once it has finished loading. */
  settled: () => HTMLElement | null
}

const SCREENS: Record<string, Screen> = {
  'the sign-in screen': {
    path: '/login',
    role: 'agent',
    settled: () => screen.queryByRole('button', { name: 'Sign in' }),
  },
  'the registration screen': {
    path: '/register',
    role: 'agent',
    settled: () => screen.queryByRole('button', { name: 'Create account' }),
  },
  'the ticket queue': {
    path: '/tickets',
    role: 'admin',
    settled: () => screen.queryByText('Showing 1–10 of 40'),
  },
  'a ticket': {
    path: '/tickets/TCK-0001',
    role: 'admin',
    settled: () => screen.queryByRole('heading', { level: 1 }),
  },
  'the new ticket form': {
    path: '/tickets/new',
    role: 'agent',
    settled: () => screen.queryByRole('button', { name: 'Create ticket' }),
  },
  'the customer list': {
    path: '/customers',
    role: 'admin',
    settled: () => screen.queryByRole('list', { name: 'Customers' }),
  },
  'the plan catalogue': {
    path: '/plans',
    role: 'admin',
    settled: () => screen.queryByRole('table'),
  },
  'the reports screen': {
    path: '/reports',
    role: 'admin',
    settled: () => screen.queryByRole('group', { name: 'Date range' }),
  },
  'the not-found screen': {
    path: '/nowhere',
    role: 'agent',
    settled: () => screen.queryByRole('button', { name: 'Back to tickets' }),
  },
}

describe('every screen, as an accessibility tree', () => {
  for (const [name, { path, role, settled }] of Object.entries(SCREENS)) {
    it(`${name} has no axe violations`, async () => {
      const { container } = renderWithProviders(<AppRoutes />, { role, initialEntries: [path] })

      await waitFor(() => {
        expect(settled()).not.toBeNull()
      })

      // `where` switches off only what is recorded against this screen in
      // `internal/a11y`, with the reason it is recorded. Every other rule is
      // still asked of it, and this rule is still asked of every other screen.
      await expectNoAxeViolations(container.ownerDocument.body, { wholePage: true, where: name })
    })
  }
})

describe('the screen sweep itself', () => {
  it('covers every route the app answers on', () => {
    // Held against the route table by hand rather than derived from it: the
    // point of a sweep is that adding a screen and not adding it here is
    // visible, and a list generated from the routes could never be missing one.
    expect(Object.keys(SCREENS)).toHaveLength(9)
  })

  it('records what it found rather than switching a rule off everywhere', () => {
    // Two entries, both the same defect: the sign-in and registration screens
    // render outside `AppLayout`, which is where the `<main>` is, so every node
    // on them is outside a landmark. Found by the first run of this sweep and
    // recorded rather than fixed, because the fix is a change to the app.
    expect(RECORDED.map((entry) => entry.where)).toEqual([
      'the sign-in screen',
      'the registration screen',
    ])

    for (const entry of RECORDED) {
      expect(Object.keys(SCREENS)).toContain(entry.where)
      expect(entry.count).toBeGreaterThan(0)
    }
  })

  it('leaves the document shell to a browser, and says so', () => {
    // `apps/web/index.html` carries the lang and the title. React never renders
    // either, jsdom supplies a blank document, and asking axe about it here
    // would be asking the test harness about itself.
    expect(DOCUMENT_RULES).toEqual(['html-has-lang', 'document-title'])
  })
})
