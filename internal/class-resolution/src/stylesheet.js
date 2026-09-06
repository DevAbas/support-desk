/**
 * stylesheet — what the built CSS actually defines.
 *
 * Why this is a scanner and not a CSS parser
 * ------------------------------------------
 * The input is not arbitrary CSS. It is one file, written by Tailwind's own
 * emitter and minified by Vite: 24KB, no author formatting, no hacks. Three
 * questions have to be answered over it — which class selectors carry
 * declarations, which custom properties are defined, and which `var()` calls
 * reference one that is not — and a brace scanner that handles comments,
 * strings and CSS escapes answers all three in a hundred lines.
 *
 * `postcss` would do it too, and is not a dependency of this repository. It
 * arrives under `node_modules` as something Vite depends on, and reaching for a
 * package nothing declares is how a check starts failing on an unrelated
 * upgrade. `internal/duplication-check` made the same call in the other
 * direction: it uses the parser the lint pass already loads.
 *
 * Known limitations
 * -----------------
 * **A declaration is anything with a colon in it.** The scanner does not
 * validate property names, so a malformed rule would read as carrying
 * declarations. Tailwind does not emit malformed rules.
 *
 * **A custom property defined anywhere counts as defined everywhere.** One set
 * only inside `@media print` reads as available to a rule outside it. The defect
 * this exists for is a token deleted outright, which leaves it defined in no
 * scope at all, so scope-narrowing is out of range on purpose rather than by
 * oversight.
 */

/**
 * @typedef {object} VarReference
 * @property {string} owner The selector list the declaration belongs to.
 * @property {string} property The property whose value holds the reference.
 * @property {string} reference The custom property being read.
 */

/**
 * @typedef {object} Stylesheet
 * @property {Set<string>} classes Class names carrying at least one declaration.
 * @property {Set<string>} customProperties Every `--x` defined anywhere in the file.
 * @property {VarReference[]} varReferences Every `var(--x)` written without a fallback.
 */

/**
 * Read a built stylesheet.
 *
 * @param {string} css
 * @returns {Stylesheet}
 */
export function parseStylesheet(css) {
  /** @type {Set<string>} */
  const classes = new Set()
  /** @type {Set<string>} */
  const customProperties = new Set()
  /** @type {VarReference[]} */
  const varReferences = []

  /** @type {{ prelude: string, declared: boolean }[]} */
  const stack = []
  let buffer = ''

  /** The nearest enclosing selector list, for the report to name. */
  const owner = () => {
    for (let depth = stack.length - 1; depth >= 0; depth -= 1) {
      const prelude = stack[depth]?.prelude ?? ''
      if (!prelude.startsWith('@')) return prelude
    }
    return stack[stack.length - 1]?.prelude ?? ''
  }

  const closeDeclaration = () => {
    const text = buffer.trim()
    buffer = ''

    const colon = text.indexOf(':')
    if (colon === -1) return

    const frame = stack[stack.length - 1]
    if (frame === undefined) return
    frame.declared = true

    const property = text.slice(0, colon).trim()
    const value = text.slice(colon + 1)

    if (property.startsWith('--')) customProperties.add(property)

    for (const reference of referencesIn(value)) {
      varReferences.push({ owner: owner(), property, reference })
    }
  }

  for (let index = 0; index < css.length; index += 1) {
    const character = css[index]

    if (character === '\\') {
      buffer += css.slice(index, index + 2)
      index += 1
      continue
    }

    if (character === '/' && css[index + 1] === '*') {
      const end = css.indexOf('*/', index + 2)
      index = end === -1 ? css.length : end + 1
      continue
    }

    if (character === '"' || character === "'") {
      const end = closingQuote(css, index)
      buffer += css.slice(index, end + 1)
      index = end
      continue
    }

    if (character === '{') {
      const prelude = buffer.trim()
      buffer = ''
      stack.push({ prelude, declared: false })

      // `@property --tint { ... }` is the one at-rule that declares a name.
      const declared = /^@property\s+(--[\w-]+)/.exec(prelude)?.[1]
      if (declared !== undefined) customProperties.add(declared)
      continue
    }

    if (character === ';') {
      closeDeclaration()
      continue
    }

    if (character === '}') {
      closeDeclaration()

      const frame = stack.pop()
      if (frame !== undefined && frame.declared && !frame.prelude.startsWith('@')) {
        for (const name of classNamesIn(frame.prelude)) classes.add(name)
      }
      continue
    }

    buffer += character
  }

  return { classes, customProperties, varReferences }
}

/**
 * The classes a rule applies to.
 *
 * Tailwind escapes everything a class name may hold and a selector may not:
 * `.bg-black\/40`, `.gap-0\.5`, `.sm\:grid-cols-4`. Decoding those is what makes
 * a selector comparable to the token written in the source, which is the whole
 * job. Reading stops at the first unescaped character a class name cannot hold,
 * so `.hover\:bg-primary:hover` yields `hover:bg-primary` and not the pseudo.
 *
 * @param {string} selector
 * @returns {string[]}
 */
export function classNamesIn(selector) {
  /** @type {string[]} */
  const names = []

  for (let index = 0; index < selector.length; index += 1) {
    if (selector[index] === '\\') {
      index += 1
      continue
    }

    // An attribute selector may hold a dot that is not a class.
    if (selector[index] === '[') {
      while (index < selector.length && selector[index] !== ']') {
        if (selector[index] === '\\') index += 1
        index += 1
      }
      continue
    }

    if (selector[index] !== '.') continue

    let cursor = index + 1
    let name = ''

    while (cursor < selector.length) {
      const character = selector[cursor] ?? ''

      if (character === '\\') {
        name += selector[cursor + 1] ?? ''
        cursor += 2
        continue
      }

      if (!/[A-Za-z0-9_-]/.test(character)) break

      name += character
      cursor += 1
    }

    if (name !== '') names.push(name)
    index = cursor - 1
  }

  return names
}

/**
 * The custom properties a value depends on and has no fallback for.
 *
 * `var(--x, 0)` is excluded: a fallback is somebody saying what happens when the
 * property is missing, which is the opposite of the defect this looks for.
 *
 * @param {string} value
 * @returns {string[]}
 */
export function referencesIn(value) {
  /** @type {string[]} */
  const references = []

  for (const match of value.matchAll(/var\(\s*(--[\w-]+)\s*([,)])/g)) {
    if (match[2] === ',') continue
    if (match[1] !== undefined) references.push(match[1])
  }

  return references
}

/**
 * The `var()` calls in a stylesheet that read a property it never defines.
 *
 * @param {Stylesheet} stylesheet
 * @returns {VarReference[]}
 */
export function danglingReferences({ customProperties, varReferences }) {
  /** @type {Set<string>} */
  const seen = new Set()

  return varReferences.filter((entry) => {
    if (customProperties.has(entry.reference)) return false

    const key = `${entry.reference} ${entry.owner} ${entry.property}`
    if (seen.has(key)) return false

    seen.add(key)
    return true
  })
}

/**
 * @param {string} css
 * @param {number} start
 * @returns {number}
 */
function closingQuote(css, start) {
  const quote = css[start]

  for (let index = start + 1; index < css.length; index += 1) {
    if (css[index] === '\\') {
      index += 1
      continue
    }
    if (css[index] === quote) return index
  }

  return css.length - 1
}
