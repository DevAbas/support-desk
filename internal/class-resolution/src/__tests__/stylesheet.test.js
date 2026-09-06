import { describe, expect, it } from 'vitest'
import {
  classNamesIn,
  danglingReferences,
  parseStylesheet,
  referencesIn,
} from '../stylesheet.js'

describe('reading a selector', () => {
  it('decodes the escapes Tailwind writes, so a selector compares to a source token', () => {
    // Every one of these is in the built stylesheet, and none of them matches
    // the string in the source until the backslashes come off.
    expect(classNamesIn('.bg-black\\/40')).toEqual(['bg-black/40'])
    expect(classNamesIn('.gap-0\\.5')).toEqual(['gap-0.5'])
    expect(classNamesIn('.sm\\:grid-cols-2')).toEqual(['sm:grid-cols-2'])
  })

  it('stops at the pseudo-class, which is not part of the name in the markup', () => {
    expect(classNamesIn('.focus-ring:focus-visible')).toEqual(['focus-ring'])
    expect(classNamesIn('.disabled\\:opacity-50:disabled')).toEqual(['disabled:opacity-50'])
  })

  it('reads every class in a selector list and every class in a compound', () => {
    expect(classNamesIn('.a,.b')).toEqual(['a', 'b'])
    expect(classNamesIn('.a .b > .c')).toEqual(['a', 'b', 'c'])
  })

  it('does not read a dot inside an attribute selector as a class', () => {
    expect(classNamesIn('.real[data-x=".fake"]')).toEqual(['real'])
  })

  it('is not fooled by a class-looking element or id', () => {
    expect(classNamesIn(':root')).toEqual([])
    expect(classNamesIn('#app')).toEqual([])
  })
})

describe('reading a stylesheet', () => {
  it('finds classes inside nested at-rules, where every responsive variant lives', () => {
    const { classes } = parseStylesheet(
      '@layer utilities{@media (min-width:48rem){.md\\:flex{display:flex}}}',
    )

    expect([...classes]).toEqual(['md:flex'])
  })

  it('ignores a rule with nothing in it, because it produces no declaration', () => {
    // The whole question this check asks is whether a class produces a
    // declaration. A rule that carries none is the same answer as no rule.
    const { classes } = parseStylesheet('.empty{}.real{color:red}')

    expect([...classes]).toEqual(['real'])
  })

  it('is not derailed by a comment or a string holding a brace', () => {
    const { classes } = parseStylesheet(
      '/* .commented{} */.real{content:"}"}',
    )

    expect([...classes]).toEqual(['real'])
  })

  it('collects custom properties from declarations and from @property alike', () => {
    const { customProperties } = parseStylesheet(
      '@property --tint{syntax:"<color>";inherits:false}:root{--radius-element:0.1875rem}',
    )

    // `syntax` and `inherits` are declarations inside the at-rule and are not
    // custom properties; the name in the prelude is.
    expect([...customProperties].sort()).toEqual(['--radius-element', '--tint'])
  })

  it('does not read the last declaration of a block as missing for want of a semicolon', () => {
    const { customProperties } = parseStylesheet(':root{--a:1;--b:2}')

    expect([...customProperties].sort()).toEqual(['--a', '--b'])
  })
})

describe('a value that reads a custom property', () => {
  it('reports a reference with no fallback, and not one with', () => {
    expect(referencesIn('var(--radius-element)')).toEqual(['--radius-element'])
    expect(referencesIn('var(--radius-element, 0)')).toEqual([])
  })

  it('reads every reference in a compound value', () => {
    expect(referencesIn('0 8px 24px var(--color-shadow) , var(--x)')).toEqual([
      '--color-shadow',
      '--x',
    ])
  })
})

describe('the second shape of not resolving', () => {
  // A token consumed inside an `@utility` body or inside another token's value
  // cannot be caught by looking for a missing class: the class is emitted, and
  // it computes to nothing. `focus-ring` is exactly that shape in this repo.
  const css =
    ':root{--focus-ring-width:2px}' +
    '.focus-ring:focus-visible{outline-width:var(--focus-ring-width);outline-color:var(--focus-ring-color)}'

  it('names the property nothing defines, and the declaration reading it', () => {
    expect(danglingReferences(parseStylesheet(css))).toEqual([
      { reference: '--focus-ring-color', owner: '.focus-ring:focus-visible', property: 'outline-color' },
    ])
  })

  it('is quiet once the token is put back', () => {
    const whole = css.replace('--focus-ring-width:2px', '--focus-ring-width:2px;--focus-ring-color:red')

    expect(danglingReferences(parseStylesheet(whole))).toEqual([])
  })

  it('says a class that still emits a rule is not the same as one that resolves', () => {
    // The class is present either way. That is the point: shape one cannot see
    // this, which is why there are two.
    expect([...parseStylesheet(css).classes]).toEqual(['focus-ring'])
  })
})
