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

import ariaModalNeedsFocusTrap from './rules/aria-modal-needs-focus-trap.js'
import docPathExists from './rules/doc-path-exists.js'
import docSymbolExists from './rules/doc-symbol-exists.js'
import noGlyphIcons from './rules/no-glyph-icons.js'
import noPrimitiveClassCopying from './rules/no-primitive-class-copying.js'
import noRawTypeClasses from './rules/no-raw-type-classes.js'
import requireListRole from './rules/require-list-role.js'
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
    // Clean, and promoted. Ten when this table was written, all in
    // `apps/web/src/features`; five were left when the scope was widened to the
    // whole of `apps/web/src`, and two of those five — a wordmark at
    // `text-base font-semibold` in `AppLayout` — were only visible *because* it
    // was widened. The old scope had been reporting zero for the app shell by
    // not looking at it.
    violations: 0,
    strict: 'error',
  },
  'no-primitive-class-copying': {
    // Clean. `Modal`, `Drawer` and `ReportToolbar` were moved onto the real
    // `CardHeader` before this plugin existed; the rule is here so they cannot
    // drift back.
    violations: 0,
    strict: 'error',
  },
  'require-list-role': {
    // Four when the rule was written — the main navigation, the saved views
    // sidebar, the comment list and the ticket history — all four laid out with
    // `flex`, which takes a list's semantics off in the same browsers that
    // removing the bullets does. `packages/ui/README.md` has stated this rule in
    // prose since `List` was built, and stated it only about `List`; none of the
    // four ever imported `List`, so none of them ever read it. All four are
    // fixed on the branch that added this rule, which is why it ships promoted.
    violations: 0,
    strict: 'error',
  },
  'aria-modal-needs-focus-trap': {
    // Clean, and never anything else. `Modal` and `Drawer` each carried an
    // unbacked `aria-modal` before they were collapsed onto `Dialog`, which now
    // holds the only one in the codebase and calls `useFocusTrap` beside it.
    // The rule is here because that pairing was restored by a refactor rather
    // than by anything that would notice it coming apart again.
    violations: 0,
    strict: 'error',
  },
  'doc-path-exists': {
    // Six when the rule was written, and every one of them the residue of a
    // structural move the prose was not moved with: five in the root README,
    // which still describes the `src/design-system/` and `src/lib/` of the
    // pre-workspace layout — including the Markdown link on line 9, so the
    // README's own "read this first" pointer was a 404 — and one in
    // `apps/web/vite.config.ts`, which said its port was kept in step with a
    // file under `server/` two commits after `server/` became `apps/api/`.
    // All six are corrected on the branch that added this rule.
    violations: 0,
    strict: 'error',
  },
  'doc-symbol-exists': {
    // Clean on the first run: twenty-five citations of a SCREAMING_SNAKE_CASE
    // table across AGENTS.md, both READMEs and the docblocks, and all twenty-five
    // resolve. It is a ratchet against a rename, not a cleanup after one — a
    // rename of `TICKET_STATUSES` would leave every instruction that tells an
    // agent to edit it pointing at nothing, with typecheck, tests and lint clean.
    violations: 0,
    strict: 'error',
  },
}

const plugin = {
  meta: {
    name: '@support-desk/eslint-plugin-harness',
    version: '0.0.0',
  },
  rules: {
    'no-glyph-icons': noGlyphIcons,
    'no-raw-type-classes': noRawTypeClasses,
    'no-primitive-class-copying': noPrimitiveClassCopying,
    'require-list-role': requireListRole,
    'aria-modal-needs-focus-trap': ariaModalNeedsFocusTrap,
    'doc-path-exists': docPathExists,
    'doc-symbol-exists': docSymbolExists,
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
