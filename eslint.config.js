import js from '@eslint/js'
import globals from 'globals'
import harness from '@support-desk/eslint-plugin-harness'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

/*
 * Two tiers, because there are two readers.
 *
 * `recommended` warns. It is what a human gets locally, mid-edit, with the file
 * half-written. `strict` errors and fails the build; it is what CI gets, and
 * what an agent gets. An agent read the rule in the same context window it wrote
 * the code in and has no half-finished thought to protect, so it has no excuse
 * for violating a stated rule. A human does.
 *
 * See internal/eslint-plugin-harness/README.md for what each rule is for and
 * which are still at `warn` because the codebase has not caught up yet.
 */
const strict = process.env.CI === 'true' || process.env.HARNESS_STRICT_LINT === '1'

/** The severity for a rule the codebase already passes. */
const level = strict ? 'error' : 'warn'

/*
 * Thresholds for the four counting rules.
 *
 * Each is set just above the worst function in the repository today, so nothing
 * fails on day one and the next function to cross the line is a new one. They
 * exist because two measurements produced a 25-to-30 line block inside a
 * `.map()` that was never extracted, in files that then drew the same row markup
 * a second time.
 *
 * Raising one of these is an acceptable answer, and it is the answer the rule
 * messages point at: a threshold raised here is one line in a diff that a
 * reviewer can argue with, where an eslint-disable comment is read once and
 * never again. Lowering one is how the ratchet tightens.
 *
 *   max-lines-per-function  185  worst today: 181, TicketListPage.tsx
 *   complexity               20  worst today:  20, TicketListPage.tsx
 *   max-depth                 3  worst today:   2, five files
 *   max-params                5  worst today:   5, fail() in apps/api/src/app.ts
 */
const thresholds = {
  'harness/max-lines-per-function': [level, { max: 185, skipBlankLines: true, skipComments: true }],
  'harness/complexity': [level, { max: 20 }],
  'harness/max-depth': [level, { max: 3 }],
  'harness/max-params': [level, { max: 5 }],
}

export default tseslint.config(
  { ignores: ['**/dist', '**/coverage'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactRefresh.configs.vite,
      strict ? harness.configs.strict : harness.configs.recommended,
    ],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
      parserOptions: {
        // `@typescript-eslint/no-deprecated` is a typed rule, so the parser
        // needs the TypeScript program. Only that one rule is turned on from
        // the typed set; the rest of the config stays syntactic.
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      /*
       * `type FormEvent` is deprecated in @types/react 19 — "FormEvent doesn't
       * actually exist" — and it propagated to four files across two
       * measurements. Nothing caught it: `tsc` reports a deprecation as a hint
       * rather than an error, so typecheck passes, and the strikethrough is
       * only visible on hover in an editor. An agent never hovers.
       *
       * Those four are migrated onto `SubmitEventHandler`, which is what the
       * auth screens use. Still `warn` in strict: the two the rule found on its
       * way past are left — `queryClient.fetchQuery` in useTicketsExport and
       * recharts' `Cell` in BarChart. Promote to `level` once zero.
       */
      '@typescript-eslint/no-deprecated': 'warn',

      ...thresholds,
    },
  },
  {
    /*
     * The design-system rules read appearance, and a test is allowed to talk
     * about appearance: asserting that a class is present, or rendering a glyph
     * to prove it is announced correctly, is the test doing its job.
     */
    files: ['**/*.test.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
    rules: {
      'harness/no-glyph-icons': 'off',
      'harness/no-raw-type-classes': 'off',
      'harness/no-primitive-class-copying': 'off',
      // A `describe` block is a container, not a function anyone should extract.
      'harness/max-lines-per-function': 'off',
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'apps/web/src/test/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    // The plugin is plain ESM JavaScript so that ESLint can load it without a
    // build step. It was unlinted before, since the config only matched `.ts`.
    files: ['internal/**/*.js', 'eslint.config.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: globals.node,
    },
  },
)
