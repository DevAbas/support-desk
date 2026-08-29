/**
 * The four threshold rules, re-messaged.
 *
 * Why this file exists
 * --------------------
 * `max-lines-per-function`, `complexity`, `max-depth` and `max-params` are
 * ESLint's own rules and there is no reason to rewrite them. What they cannot do
 * is carry a message, and the message is the point: a bare "has too many lines
 * (181). Maximum allowed is 185." tells a reader a number and nothing about what
 * to do with it, or about the one thing they most need to know — that the
 * threshold is arguable.
 *
 * So the logic here is ESLint's, untouched. Only `meta.messages` is replaced.
 * Each is still configured, with its threshold, in `eslint.config.js`; nothing
 * about how they count has changed.
 *
 * Böckeler's technique
 * --------------------
 * Every message ends by saying that raising the threshold is an acceptable
 * answer. That is not a loophole, it is the mechanism. A threshold raised in
 * `eslint.config.js` is one line in a diff: a reviewer sees it, and can ask why.
 * An `eslint-disable` comment is seen once, by the person adding it, and never
 * again. Given a rule that is sometimes wrong, the useful design is the one
 * whose escape hatch stays visible.
 *
 * The defect behind the thresholds: two measurements produced a 25-to-30 line
 * block inside a `.map()` that was never extracted, in files that then drew the
 * same row markup a second time a few lines down. The block was a component
 * nobody had named. Nothing flagged it, because nothing was counting.
 *
 * What the four short pieces of advice mean
 * -----------------------------------------
 * - **Extract the block into a named function.** The `.map()` body above was a
 *   row component, and the second copy of the markup happened because there was
 *   nothing to reuse. Naming it is what makes it reusable.
 * - **Name the branches.** This codebase resolves most branching with a lookup
 *   table keyed by a union — `Record<BadgeStatus, string>` in `Badge`,
 *   `Record<IconName, LucideIcon>` in `Icon`. That turns a chain of conditions
 *   into a table a reader can scan, and makes an unhandled case a type error.
 * - **Return early.** Depth is usually a decision and a body tangled together.
 * - **Take an options object.** A long parameter list is usually two functions
 *   sharing a body, and it is always a call site where two arguments can be
 *   swapped without the types noticing.
 */

import { builtinRules } from 'eslint/use-at-your-own-risk'

/**
 * The clause that makes a raised threshold the reviewable answer.
 *
 * Short, because it is appended to every reported message. The argument for it
 * is above and in the README; what has to survive per violation is the fact that
 * raising the number is allowed, since a reader who does not know that will
 * reach for an eslint-disable instead.
 */
const THRESHOLD_IS_ARGUABLE =
  'Raising the threshold in eslint.config.js is a fair answer and shows up in the diff, where ' +
  'an eslint-disable does not.'

/** What to do instead, per rule, in one clause. */
const ADVICE = {
  'max-lines-per-function': 'Extract the block into a named function.',
  complexity: 'Name the branches — a lookup table keyed by a union is how this codebase does it.',
  'max-depth': 'Return early, or lift the inner block into a named function.',
  'max-params': 'Take an options object, or split the function.',
}

/**
 * A core rule with the same behaviour and a message that says what to do.
 *
 * @param {keyof typeof ADVICE} ruleId
 */
export function withThresholdGuidance(ruleId) {
  const rule = builtinRules.get(ruleId)

  if (rule === undefined) {
    throw new Error(`No built-in ESLint rule named "${ruleId}" — it may have been renamed.`)
  }

  const suffix = ` ${ADVICE[ruleId]} ${THRESHOLD_IS_ARGUABLE}`

  return {
    ...rule,
    meta: {
      ...rule.meta,
      messages: Object.fromEntries(
        Object.entries(rule.meta.messages).map(([messageId, text]) => [messageId, text + suffix]),
      ),
    },
  }
}

export const thresholdRules = {
  'max-lines-per-function': withThresholdGuidance('max-lines-per-function'),
  complexity: withThresholdGuidance('complexity'),
  'max-depth': withThresholdGuidance('max-depth'),
  'max-params': withThresholdGuidance('max-params'),
}
