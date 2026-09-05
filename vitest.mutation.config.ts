import { defineConfig } from 'vitest/config'

/**
 * The test surface `npm run test:mutation:fast` uses, which is not all of it.
 *
 * Why a second, smaller surface exists
 * -----------------------------------
 * A mutation run costs the test suite once per mutant, so its price is set by
 * how many tests each mutant reaches. `packages/shared` is imported by very
 * nearly every file in `apps/web`, and against the full suite Stryker measured
 * 77 tests per mutant and **81 minutes**. That is the honest number and it is
 * what CI runs; it is not a number anybody will wait for while working.
 *
 * Dropping the `web` project takes that to **5 minutes**, and the tests left are
 * the ones that exercise the mutated code rather than the ones that happen to
 * import it: `api` calls the shared contract and the workflow directly, `shared`
 * has the workflow's own tests, and `ui` covers the two mutated files that live
 * there.
 *
 * What it costs, measured rather than assumed
 * -------------------------------------------
 * Seven points: **84.39% over the full suite, 77.21% here.** The delta is not
 * spread evenly, and where it lands is the useful part:
 *
 *   types.ts        100.00 → 33.33
 *   navigation.ts    56.90 → 43.10
 *   workflow.ts      96.73 → 86.93
 *   customers.ts     93.02 → 90.70
 *   reports.ts       93.33 → 93.33
 *   useFocusTrap.ts  68.75 → 67.50
 *
 * `types.ts` and `navigation.ts` are the two that collapse, and for the same
 * reason: they are mostly *labels* — `TICKET_STATUS_LABELS`, the nav table's
 * display names — which are rendered and never served, so the API tests cannot
 * see them being wrong and only a screen can. The initial guess when this file
 * was written was that the web tests were redundant, reaching `packages/shared`
 * through MSW into the same API routes. That was wrong, and these numbers are
 * what said so.
 *
 * So this is a proxy, not the measurement. It is accurate about the branching
 * (`reports.ts` and `contract.ts` are unchanged, and both headline findings show
 * up in either) and blind to anything whose only reader is a screen.
 *
 * The two harness projects are excluded from both runs for a different reason:
 * neither `eslint-plugin-harness` nor `duplication-check` imports a mutated
 * file, so every one of their tests would run against every mutant and none
 * could ever fail.
 */
export default defineConfig({
  test: {
    projects: [
      './packages/ui/vitest.config.ts',
      { test: { name: 'api', root: './apps/api', environment: 'node' } },
      { test: { name: 'shared', root: './packages/shared', environment: 'node' } },
    ],
  },
})
