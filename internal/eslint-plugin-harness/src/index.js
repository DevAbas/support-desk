/**
 * eslint-plugin-harness — the defects this codebase produces, written down.
 *
 * Every rule here comes from a defect that was actually recorded, more than
 * once, in work produced against this repository. None of them was caught by
 * typecheck, by tests, or by review.
 *
 * Two configs, because two readers
 * --------------------------------
 * `recommended` warns and never blocks. It is for a human with the file open,
 * mid-edit, who has not finished the thought yet — a rule that fails the build
 * while someone is still typing teaches them to stop reading it.
 *
 * `strict` errors and fails the build. It is for CI and for agents. An agent has
 * no excuse for violating a stated rule: it read the rule in the same context
 * window it wrote the code in, it is not mid-edit, and it has no half-finished
 * thought to protect. A human does.
 *
 * The rollout, and how a rule gets promoted
 * -----------------------------------------
 * A rule ships at the level this codebase can currently pass. Where a rule still
 * has violations it stays at `warn` in `strict` too, with the count recorded
 * below, because a config nobody can turn on is a config nobody turns on. When
 * the count reaches zero the rule moves to `error` in `strict` — one edit to
 * this table, visible in a diff.
 */

import noGlyphIcons from './rules/no-glyph-icons.js'
import noPrimitiveClassCopying from './rules/no-primitive-class-copying.js'
import noRawTypeClasses from './rules/no-raw-type-classes.js'
import { thresholdRules } from './thresholdRules.js'

/**
 * The rollout state of every rule this plugin owns.
 *
 * `violations` is the count in this repository at the time the plugin was
 * written; it is what the README reports and what promotion is measured
 * against. `strict` is the severity CI uses today.
 */
const ROLLOUT = {
  'no-glyph-icons': {
    // Three, and none of them is an icon: two ellipses in "Loading…" and a
    // middot between two facts on the ticket screen. The five icon glyphs this
    // rule was written for are already gone — `Icon` replaced them. What is
    // left is typographic punctuation sitting in JSX text, which the rule
    // cannot tell apart from a glyph and does not try to; the fix is to move
    // each into a string literal, which is where the rule stops looking.
    violations: 3,
    strict: 'warn',
  },
  'no-raw-type-classes': {
    // Nine raw sizes and one `font-semibold`, all in `apps/web/src/features`.
    // Not fixed here: this change is the rules.
    violations: 10,
    strict: 'warn',
  },
  'no-primitive-class-copying': {
    // Clean. `Modal`, `Drawer` and `ReportToolbar` were moved onto the real
    // `CardHeader` before this plugin existed; the rule is here so they cannot
    // drift back.
    violations: 0,
    strict: 'error',
  },
}

const plugin = {
  meta: {
    name: '@harness-sample/eslint-plugin-harness',
    version: '0.0.0',
  },
  rules: {
    'no-glyph-icons': noGlyphIcons,
    'no-raw-type-classes': noRawTypeClasses,
    'no-primitive-class-copying': noPrimitiveClassCopying,
    ...thresholdRules,
  },
  configs: {},
}

/** `{ 'harness/no-glyph-icons': severity, ... }` for the rules in ROLLOUT. */
function severities(pick) {
  return Object.fromEntries(
    Object.entries(ROLLOUT).map(([name, state]) => [`harness/${name}`, pick(state)]),
  )
}

plugin.configs.recommended = {
  name: 'harness/recommended',
  plugins: { harness: plugin },
  rules: severities(() => 'warn'),
}

plugin.configs.strict = {
  name: 'harness/strict',
  plugins: { harness: plugin },
  rules: severities((state) => state.strict),
}

export default plugin
export { ROLLOUT }
