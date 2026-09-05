/**
 * The accessibility tree, asserted against rather than described.
 *
 * Why this layer exists on top of the lint rules
 * ----------------------------------------------
 * `internal/eslint-plugin-harness` reads source, and there is a class of defect
 * it cannot reach because the source is right and the result is wrong. An
 * `aria-labelledby` pointing at an id that a conditional did not render; two
 * controls that each generate a correct id and collide once both are on the
 * screen; a heading level that is fine in a component and skips a level in the
 * page that composes it; a `role="option"` whose owning listbox is somewhere
 * else in the tree. Every one of those is a correct-looking file, and every one
 * of them is only wrong once the DOM exists.
 *
 * The DOM already exists here. `apps/web` and `packages/ui` both run under jsdom
 * with Testing Library, 562 tests deep, rendering the real components with the
 * real markup. Nothing was asking the rendered result whether it was navigable.
 * This does.
 *
 * What axe cannot see in jsdom, which is most of what it is famous for
 * -------------------------------------------------------------------
 * jsdom has no layout engine: no boxes, no computed geometry, no painting. So
 * every rule whose question is "what does this look like" is either skipped by
 * axe itself or answers from a stylesheet that was never applied — `css: false`
 * is set in both vitest configs, so the components render entirely unstyled.
 *
 * That rules out the whole visual half of WCAG. Colour contrast, target size,
 * focus visibility, reflow, text spacing, and anything about what is actually
 * on screen: **none of it is checked anywhere in this repository**, and no
 * amount of jsdom testing will change that. What is left is the half that lives
 * in the markup — roles, names, relationships, state — which is the half a
 * screen reader reads and the half that breaks silently.
 *
 * The page-level rules are off for a different reason: a component rendered on
 * its own is not a page. `region` wants every node inside a landmark and
 * `page-has-heading-one` wants an `h1`. A `Badge` rendered alone fails both and
 * is not wrong. Those are switched off for a fragment and back on for the screen
 * sweeps in `apps/web`, where there is a page to ask them of.
 *
 * Two more are off everywhere and stay off: `html-has-lang` and `document-title`
 * are properties of `apps/web/index.html`, which React never renders and jsdom
 * supplies a blank version of. They are unchecked, they are named below, and the
 * place to check them is a browser.
 */

import axe, { type AxeResults, type ElementContext, type Result, type RunOptions } from 'axe-core'

/**
 * Rules a fragment cannot satisfy because it is a fragment.
 *
 * Every one of these asks a question about a whole document. They are not
 * disabled on the screen sweeps in `apps/web`, which render a page.
 */
export const PAGE_RULES = [
  'region',
  'landmark-one-main',
  'landmark-unique',
  'page-has-heading-one',
  'bypass',
] as const

/**
 * Rules about the document shell, which React does not render.
 *
 * `apps/web/index.html` carries the `lang` and the `<title>`; jsdom supplies a
 * blank document and the app mounts into it. Asking these here would be asking
 * the test harness about itself. Off everywhere, and written down so that "the
 * a11y sweep is green" is not read as covering them.
 */
export const DOCUMENT_RULES = ['html-has-lang', 'document-title'] as const

/**
 * Rules that need layout, which jsdom does not have.
 *
 * axe skips most of these on its own and reports them as "incomplete" rather
 * than passing them, which is worse than a failure because it looks like a pass.
 * Naming them here is the difference between a checked rule and an unchecked one
 * that nobody knew was unchecked.
 */
export const NEEDS_LAYOUT = ['color-contrast', 'target-size', 'scrollable-region-focusable'] as const

export interface RecordedViolation {
  /** The axe rule, so the entry can be looked up and switched off where it applies. */
  rule: string
  /** The one place it applies — a screen name from the sweep, never everywhere. */
  where: string
  /** How many nodes were failing when it was recorded. Removing it is a visible edit. */
  count: number
  reason: string
}

/**
 * Violations found and recorded rather than fixed.
 *
 * The same ledger as `ROLLOUT` in the lint plugin, and for the same reason: a
 * sensor that cannot ship until the codebase is perfect is a sensor that does
 * not ship. An entry is a promise that somebody looked, not that nothing is
 * wrong.
 *
 * `where` is required and is never a wildcard. A rule switched off everywhere is
 * a rule deleted; these are switched off for one screen, so the same rule is
 * still asked of every other one — which is what caught these two.
 */
export const RECORDED: readonly RecordedViolation[] = [
  {
    rule: 'region',
    where: 'the sign-in screen',
    count: 4,
    reason:
      'The auth screens render outside AppLayout, which is where the <main> is, so everything ' +
      'on them sits outside a landmark. Found by the first run of this sweep; the fix is a ' +
      'landmark on the auth shell, and it is a change to the app rather than to the sensor.',
  },
  {
    rule: 'region',
    where: 'the registration screen',
    count: 4,
    reason: 'The same shell, the same missing landmark, on the other screen outside AppLayout.',
  },
]

/** The rules recorded against one place, which are the only ones switched off for it. */
export function recordedFor(where: string): string[] {
  return RECORDED.filter((entry) => entry.where === where).map((entry) => entry.rule)
}

export interface AxeCheckOptions {
  /** A page, so the landmark and heading rules apply. Default: a fragment, so they do not. */
  wholePage?: boolean
  /** The name this render is recorded under, if it has entries in `RECORDED`. */
  where?: string
  /** Rules to switch off for this render alone, each with a reason at the call site. */
  disable?: readonly string[]
}

function optionsFor({ wholePage = false, where, disable = [] }: AxeCheckOptions): RunOptions {
  const rules: RunOptions['rules'] = {}

  const off = [
    ...NEEDS_LAYOUT,
    ...DOCUMENT_RULES,
    ...disable,
    ...(where === undefined ? [] : recordedFor(where)),
    ...(wholePage ? [] : PAGE_RULES),
  ]

  for (const rule of off) {
    rules[rule] = { enabled: false }
  }

  return { rules, resultTypes: ['violations'] }
}

/** Every accessibility violation axe can find in `container`, as it is rendered. */
export async function findAxeViolations(
  container: ElementContext,
  options: AxeCheckOptions = {},
): Promise<Result[]> {
  const results: AxeResults = await axe.run(container, optionsFor(options))

  return results.violations
}

/**
 * Fails with what is wrong and which element it is on, rather than with a count.
 *
 * The message is the whole value of this helper. axe's own result object is
 * deep, and a test that fails with `expected 3 to be 0` sends the reader to a
 * debugger; one that fails with the rule, the sentence and the offending markup
 * sends them to the fix.
 */
export async function expectNoAxeViolations(
  container: ElementContext,
  options: AxeCheckOptions = {},
): Promise<void> {
  const violations = await findAxeViolations(container, options)

  if (violations.length === 0) return

  throw new Error(`Accessibility violations:\n\n${violations.map(describe).join('\n\n')}`)
}

function describe(violation: Result): string {
  const where = violation.nodes
    .map((node) => `    ${node.target.join(' ')}\n      ${node.html}`)
    .join('\n')

  return `  [${violation.id}] ${violation.help}\n  ${violation.helpUrl}\n${where}`
}
