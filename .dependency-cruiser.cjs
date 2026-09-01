/*
 * Workspace boundaries.
 *
 * The split into `apps/` and `packages/` was done so that the design system and
 * the shared contract could not learn what a ticket screen is. Today that is
 * enforced by nothing but package resolution — `packages/ui` does not depend on
 * `@support-desk/web`, so an import of it does not resolve, so nobody writes
 * one. That is a real constraint right up to the moment someone adds the
 * dependency, or a path alias, or merges two workspaces during a restructure,
 * at which point the boundary is gone and no diff says so.
 *
 * These three rules say it out loud, so undoing the split has to be deliberate.
 *
 * Run with `npm run lint:boundaries`.
 */

/** Anything under a `features/` directory, at any depth. */
const FEATURE_DIRECTORY = '(^|/)features/'

module.exports = {
  forbidden: [
    {
      name: 'ui-not-to-app-or-feature',
      comment:
        'packages/ui must not import from apps/ or from a feature directory. The design system ' +
        'is handed data and renders it; a primitive that reaches into a screen is a primitive ' +
        'that can only be used on that screen. See "The design system must not learn what a ' +
        'ticket is" in packages/ui/README.md.',
      severity: 'error',
      from: { path: '^packages/ui/' },
      to: { path: ['^apps/', FEATURE_DIRECTORY] },
    },
    {
      name: 'shared-not-to-app-or-feature',
      comment:
        'packages/shared must not import from apps/ or from a feature directory. It holds the ' +
        'contract both sides are written against — the API and the web app each depend on it, ' +
        'and it depends on neither. An import in this direction makes the contract a consumer ' +
        'of one of its own consumers.',
      severity: 'error',
      from: { path: '^packages/shared/' },
      to: { path: ['^apps/', FEATURE_DIRECTORY] },
    },
    {
      name: 'shared-not-to-ui',
      comment:
        'packages/shared must not import from packages/ui. shared sits below ui — ui imports ' +
        'cn() from it — so an import back up is a cycle in the layering even where the module ' +
        'graph happens not to close one.',
      severity: 'error',
      from: { path: '^packages/shared/' },
      to: { path: '^packages/ui/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '(^|/)dist/' },

    // Type-only imports count. `import type { Ticket } from '@support-desk/web'`
    // erases at build time and would leave no trace in the bundle, which is
    // exactly what makes it the easy way to cross a boundary by accident.
    tsPreCompilationDeps: true,

    // Workspace packages are symlinks into `packages/`. Following them to the
    // real path is the point: `@support-desk/ui` has to be reported as
    // `packages/ui/...` for a rule keyed on that path to see it at all.
    preserveSymlinks: false,

    enhancedResolveOptions: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
      mainFields: ['module', 'main', 'types'],
    },
  },
}
