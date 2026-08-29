import { describe, expect, it } from 'vitest'
import plugin, { ROLLOUT } from '../index.js'

describe('the two tiers', () => {
  it('recommended never blocks: every rule is a warning', () => {
    for (const severity of Object.values(plugin.configs.recommended.rules)) {
      expect(severity).toBe('warn')
    }
  })

  it('strict errors on every rule the codebase already passes', () => {
    for (const [name, state] of Object.entries(ROLLOUT)) {
      const expected = state.violations === 0 ? 'error' : 'warn'

      expect(plugin.configs.strict.rules[`harness/${name}`]).toBe(expected)
    }
  })

  it('covers every rule this plugin owns except the wrapped core ones', () => {
    // The four counting rules take a threshold, so they are configured in
    // eslint.config.js rather than carried at a fixed severity here.
    const own = Object.keys(plugin.rules).filter((name) => name in ROLLOUT)

    expect(own.sort()).toEqual(Object.keys(ROLLOUT).sort())
    expect(Object.keys(plugin.configs.strict.rules)).toHaveLength(own.length)
  })
})

describe('rollout', () => {
  it('records a violation count for every rule, so promotion has a number', () => {
    for (const state of Object.values(ROLLOUT)) {
      expect(Number.isInteger(state.violations)).toBe(true)
      expect(state.violations).toBeGreaterThanOrEqual(0)
    }
  })

  it('never ships a rule the codebase cannot pass as an error', () => {
    for (const state of Object.values(ROLLOUT)) {
      if (state.violations > 0) expect(state.strict).toBe('warn')
    }
  })
})
