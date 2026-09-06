/**
 * class-resolution — a Tailwind class in the source that produces no CSS.
 *
 * Why this exists
 * ---------------
 * `packages/ui/src/tokens.css` resets Tailwind's radius namespace with
 * `--radius-*: initial` and then defines four names. Delete one and the class
 * stays in the string. `tsc` cannot see CSS. The tests assert the class name and
 * the name is still there — `Alert.test.tsx` asserts `rounded-element` three
 * times, once positively and twice negatively, and all three stay green with the
 * token gone. Lint has no rule and a rule is hard to write, because
 * `rounded-element` is not wrong; it stopped resolving. It has happened once
 * here already, on radius, and the only thing that noticed was somebody looking
 * at a screenshot.
 *
 * Every other check in this repository reads the source. This one reads the
 * artifact: the stylesheet Vite actually built. A class Tailwind's own scanner
 * saw and emitted nothing for is not a heuristic — it is an answer.
 *
 * What it reads, and why the file list comes from git
 * ---------------------------------------------------
 * The file list is `git ls-files`, which is to say *tracked* files, and
 * deliberately not a filesystem walk that honours `.gitignore`. Tailwind's
 * scanner does honour it, and that is exactly how this check found its first
 * defect: `.gitignore` carried a bare `reports` for Stryker's output at the repo
 * root, an unanchored pattern matches a directory of that name at any depth, and
 * so the whole of `apps/web/src/features/reports` was invisible to Tailwind.
 * `text-right`, `tabular-nums` and `xl:grid-cols-4` produced no CSS at all. A
 * check that inherited that blind spot would have reported nothing.
 *
 * The two shapes of not resolving
 * -------------------------------
 * A class can die on either side of the utility, and both are invisible to
 * everything else here:
 *
 *   1. No rule. The token the utility was built from is gone, so Tailwind emits
 *      nothing for the class. This is the `--radius-element` case.
 *   2. No value. The rule is emitted and references a custom property that
 *      nothing defines. `@utility focus-ring` and `@utility interactive` copy
 *      `var(--focus-ring-color)` and `var(--color-overlay-hover)` into their
 *      bodies verbatim, and `--shadow-overlay` carries `var(--color-shadow)`
 *      inside its own value. Delete any of those and the class still emits a
 *      rule that computes to nothing, so shape 1 cannot see it.
 *
 * What it cannot see is in README.md, with the numbers.
 */

/** Where `vite build` leaves the stylesheet. Vite content-hashes the name. */
export const STYLESHEET_DIRECTORY = 'apps/web/dist/assets'

/**
 * The pathspec for the file list, and the extensions worth parsing.
 *
 * `internal` is left out on purpose: the lint plugin's fixtures are JSX written
 * as string literals, so they read as class strings while being test data that
 * no stylesheet was ever meant to cover. Measured, they are 20 sites of noise
 * and no signal.
 */
export const SOURCE_PATHS = ['apps', 'packages']

/** Markdown is excluded here the same way `index.css` excludes it from Tailwind. */
export const SOURCE_FILE = /\.(?:tsx?|jsx?)$/

/**
 * What the stylesheet is built from, for the staleness check.
 *
 * Vite's root is `apps/web`, and `apps/web/src/index.css` names one more root
 * explicitly with `@source '../../../packages/ui/src'`. Nothing else reaches the
 * stylesheet, so nothing else should make it look out of date.
 */
export const STYLESHEET_INPUTS = ['apps/web', 'packages/ui/src']

/**
 * A string literal is a class string when it sits in a value position that
 * produces one. Three, and between them they reach every class in this
 * repository — see the `unreached` count in the report, which is what says so
 * on every run rather than only on the day this was written.
 */

/**
 * `className`, `class`, and `Dialog`'s `overlayClassName` / `panelClassName`.
 *
 * @param {string} name
 * @returns {boolean}
 */
export function isClassAttribute(name) {
  return name === 'class' || name === 'className' || name.endsWith('ClassName')
}

/** The helpers whose arguments are class strings. `cn` is this repo's. */
export const CLASS_CALLS = new Set(['cn', 'clsx', 'twMerge', 'cx', 'toHaveClass'])

/**
 * The house pattern: a module-level constant above the component, most often a
 * `Record<Union, string>`. Thirty of them across `apps/web` and `packages/ui` —
 * `baseClasses`, `variantClasses`, `toneClasses`, `controlClasses` and the rest.
 * They reach `cn()` as an identifier, so the call rule cannot see them.
 */
export const CLASS_VARIABLE = /Classes$/

/**
 * Classes that produce no CSS and are not being fixed now.
 *
 * The ratchet, in the shape `internal/duplication-check` and `internal/a11y`
 * already use: an entry needs a `reason` that is an argument rather than a
 * label, an unrecorded finding fails the check, and a recorded entry that no
 * longer reproduces also fails — a stale entry is a claim nobody has re-read,
 * and deleting it is one line in a diff.
 *
 * Empty. The three the first run found were a one-character `.gitignore` bug
 * rather than a decision, so they were fixed rather than recorded. README.md has
 * the run.
 *
 * @type {readonly { class: string, where: string, reason: string }[]}
 */
export const RECORDED = []
