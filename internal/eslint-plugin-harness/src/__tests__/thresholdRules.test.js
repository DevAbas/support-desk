import { describe, expect, it } from 'vitest'
import { thresholdRules, withThresholdGuidance } from '../thresholdRules.js'
import { createRuleTester } from './ruleTester.js'

const ruleTester = createRuleTester()

/*
 * These four are ESLint's own rules with the message replaced, so the tests do
 * two things: prove the counting still works (the wrapper has not broken the
 * rule it wraps) and prove the message says the thing it exists to say.
 */

ruleTester.run('harness/max-lines-per-function', thresholdRules['max-lines-per-function'], {
  valid: [
    {
      name: 'a function inside the threshold',
      code: 'function short() {\n  return 1\n}',
      options: [{ max: 3 }],
    },
  ],
  invalid: [
    {
      name: 'a function over it',
      code: 'function long() {\n  const a = 1\n  const b = 2\n  return a + b\n}',
      options: [{ max: 3 }],
      errors: [{ messageId: 'exceed' }],
    },
  ],
})

ruleTester.run('harness/complexity', thresholdRules.complexity, {
  valid: [{ code: 'function plain(a) {\n  return a\n}', options: [{ max: 2 }] }],
  invalid: [
    {
      code: 'function branchy(a, b, c) {\n  if (a) return 1\n  if (b) return 2\n  if (c) return 3\n  return 4\n}',
      options: [{ max: 2 }],
      errors: [{ messageId: 'complex' }],
    },
  ],
})

ruleTester.run('harness/max-depth', thresholdRules['max-depth'], {
  valid: [{ code: 'function flat(a) {\n  if (a) return 1\n  return 2\n}', options: [{ max: 1 }] }],
  invalid: [
    {
      code: 'function nested(a, b) {\n  if (a) {\n    if (b) {\n      return 1\n    }\n  }\n  return 2\n}',
      options: [{ max: 1 }],
      errors: [{ messageId: 'tooDeeply' }],
    },
  ],
})

ruleTester.run('harness/max-params', thresholdRules['max-params'], {
  valid: [{ code: 'function few(a, b) {\n  return a + b\n}', options: [{ max: 2 }] }],
  invalid: [
    {
      code: 'function many(a, b, c) {\n  return a + b + c\n}',
      options: [{ max: 2 }],
      errors: [{ messageId: 'exceed' }],
    },
  ],
})

const RAISING_IT = 'Raising the threshold in eslint.config.js is a fair answer'

describe('threshold messages', () => {
  it('every message says that raising the threshold is an acceptable answer', () => {
    for (const rule of Object.values(thresholdRules)) {
      for (const message of Object.values(rule.meta.messages)) {
        expect(message).toContain(RAISING_IT)
        expect(message).toContain('shows up in the diff')
      }
    }
  })

  it('every message says what to do instead, before it says that', () => {
    const advice = {
      'max-lines-per-function': 'named function',
      complexity: 'lookup table',
      'max-depth': 'Return early',
      'max-params': 'options object',
    }

    for (const [ruleId, expected] of Object.entries(advice)) {
      for (const message of Object.values(thresholdRules[ruleId].meta.messages)) {
        expect(message).toContain(expected)
        expect(message.indexOf(expected)).toBeLessThan(message.indexOf(RAISING_IT))
      }
    }
  })

  it('stays short: the count, one clause of advice, one clause on the threshold', () => {
    // These fire per function, so the same tail repeats down the whole run.
    // The reasoning lives in the docblock and the README, read once.
    for (const rule of Object.values(thresholdRules)) {
      for (const message of Object.values(rule.meta.messages)) {
        expect(message.length).toBeLessThan(300)
      }
    }
  })

  it('keeps the original count in the message it wraps', () => {
    const original = 'has too many lines ({{lineCount}}). Maximum allowed is {{maxLines}}.'

    expect(thresholdRules['max-lines-per-function'].meta.messages.exceed).toContain(original)
  })

  it('fails loudly if a core rule is ever renamed away', () => {
    expect(() => withThresholdGuidance('max-lines-per-fn')).toThrow(/No built-in ESLint rule/)
  })
})
