import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { scanSource } from '../source.js'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..')

const never = () => false

/**
 * The class names one snippet writes, in order.
 *
 * @param {string} code
 * @param {string} [fileName]
 */
const namesIn = (code, fileName = 'x.tsx') =>
  scanSource(code, fileName, never).tokens.map((token) => token.name)

describe('the four places a class is written here', () => {
  it('reads a className attribute', () => {
    expect(namesIn('<li className="rounded-element border" />')).toEqual([
      'rounded-element',
      'border',
    ])
  })

  it("reads Dialog's overlayClassName and panelClassName, which are class props too", () => {
    expect(namesIn('<Dialog overlayClassName="p-4" panelClassName="rounded-container" />')).toEqual([
      'p-4',
      'rounded-container',
    ])
  })

  it('reads the arguments of cn(), including the ones a condition guards', () => {
    expect(namesIn("cn('rounded-element border', error && 'border-danger', className)")).toEqual([
      'rounded-element',
      'border',
      'border-danger',
    ])
  })

  it('reads a module-level Record of variants, which is where a primitive keeps them', () => {
    const code =
      "const variantClasses: Record<AlertVariant, string> = {\n" +
      "  callout: 'items-start rounded-element border',\n" +
      "  inline: 'bg-transparent p-0',\n" +
      '}'

    expect(namesIn(code)).toEqual([
      'items-start',
      'rounded-element',
      'border',
      'bg-transparent',
      'p-0',
    ])
  })

  it('reads a base string split across a concatenation, which never splits a token', () => {
    const code = "const baseClasses =\n  'inline-flex rounded-element border ' +\n  'font-medium'"

    expect(namesIn(code)).toEqual(['inline-flex', 'rounded-element', 'border', 'font-medium'])
  })

  it('reads toHaveClass, positively and negatively alike', () => {
    // This is the shape the whole check exists for. Both assertions stay green
    // when the token behind the class is deleted, so the class name has to be
    // read out of the test as readily as out of the component.
    const code =
      "expect(alert).toHaveClass('rounded-element', 'border')\n" +
      "expect(alert).not.toHaveClass('rounded-element')"

    expect(namesIn(code)).toEqual(['rounded-element', 'border', 'rounded-element'])
  })
})

describe('what a class position stops at', () => {
  it('does not follow a call into its callee', () => {
    // Without this, every `expect(screen.getByRole('button')).toHaveClass(...)`
    // in the suite reports `button` as a class that produces no CSS.
    const code = "expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('flex')"

    expect(namesIn(code)).toEqual(['flex'])
  })

  it('does not follow an element access into its index', () => {
    // `intentClasses[change.intent ?? 'neutral']` — the class is what the map
    // returns, and `neutral` is the key it was asked for.
    expect(namesIn("cn('flex', intentClasses[intent ?? 'neutral'])")).toEqual(['flex'])
  })

  it('does not follow a conditional into its condition', () => {
    expect(namesIn("cn(variant === 'primary' ? 'bg-primary' : 'bg-muted')")).toEqual([
      'bg-primary',
      'bg-muted',
    ])
  })

  it('does not follow a comparison into either side of it', () => {
    expect(namesIn("cn(size === 'sm' && 'h-7')")).toEqual(['h-7'])
  })

  it('does not follow a call that is not a class helper into its arguments', () => {
    // The class is what `toneFor` returns. Its argument is a person's name.
    expect(namesIn("cn('flex', toneFor('Alice Brand'))")).toEqual(['flex'])
  })

  it('does not follow a class attribute into a nested attribute that is not one', () => {
    expect(namesIn('<a className={cn(<Icon name="arrow-up" />)} />')).toEqual([])
  })

  it('does not read an object key as a class', () => {
    expect(namesIn("const sizeClasses = { 'sm': 'h-7', md: 'h-9' }")).toEqual(['h-7', 'h-9'])
  })

  it('reads nothing from a string that is simply a string', () => {
    expect(namesIn("const message = 'Could not load tickets.'")).toEqual([])
  })
})

describe('a class the source builds rather than writes', () => {
  const code = 'const sizeClasses = `flex rounded-${size} border`'
  const scan = scanSource(code, 'x.ts', never)

  it('reports the fragment an interpolation runs into rather than guessing at it', () => {
    expect(scan.spliced.map((site) => site.name)).toEqual(['rounded-'])
  })

  it('still reads the whole tokens beside it', () => {
    expect(scan.tokens.map((token) => token.name)).toEqual(['flex', 'border'])
  })

  it('counts a fragment on the far side of the expression too', () => {
    const both = scanSource('const aClasses = `p-${a}-${b} flex`', 'x.ts', never)

    expect(both.spliced.map((site) => site.name)).toEqual(['p-', '-'])
    expect(both.tokens.map((token) => token.name)).toEqual(['flex'])
  })
})

describe('the coverage this cannot claim, counted on every run', () => {
  // A class list written where none of the position rules look. Nothing here
  // does this today; the count is what says so on the day something does,
  // rather than the coverage narrowing with no sign of it.
  /** @param {string} name */
  const isKnownClass = (name) => name === 'border-border'

  it('counts a class list outside every position, rather than reading or ignoring it', () => {
    const scan = scanSource("const styles = 'border-border rounded-element'", 'x.ts', isKnownClass)

    expect(scan.tokens).toEqual([])
    expect(scan.outside).toHaveLength(1)
  })

  it('needs a hyphenated known class as evidence, so prose is not mistaken for markup', () => {
    // "…is inline" would otherwise qualify on the strength of `.inline`.
    const prose = scanSource("it('carries no chrome of its own inline', () => {})", 'x.ts', (name) =>
      name === 'inline',
    )

    expect(prose.outside).toEqual([])
  })
})

describe('where it says a class is', () => {
  it('points at the class rather than at the line', () => {
    const scan = scanSource('  <li className="flex rounded-element" />', 'x.tsx', never)

    expect(scan.tokens).toEqual([
      { name: 'flex', line: 1, column: 18 },
      { name: 'rounded-element', line: 1, column: 23 },
    ])
  })
})

describe('over the real tree', () => {
  /** @param {string} file */
  const read = (file) => readFileSync(path.join(REPO_ROOT, file), 'utf8')
  /** @param {string} file */
  const namesFrom = (file) => scanSource(read(file), file, never).tokens.map((token) => token.name)

  // One real file per shape. If any of these stops being reached, the acceptance
  // run stops naming a file it has to name, and this is where that shows up.
  it('reaches rounded-element in a className attribute', () => {
    expect(namesFrom('apps/web/src/features/tickets/components/CommentList.tsx')).toContain(
      'rounded-element',
    )
  })

  it('reaches rounded-element inside cn(), under a render prop', () => {
    expect(namesFrom('apps/web/src/app/AppLayout.tsx')).toContain('rounded-element')
  })

  it("reaches rounded-element in Alert's variant map", () => {
    expect(namesFrom('packages/ui/src/components/Alert/Alert.tsx')).toContain('rounded-element')
  })

  it('reaches all three of the assertions in Alert.test.tsx', () => {
    const names = namesFrom('packages/ui/src/components/Alert/Alert.test.tsx')

    expect(names.filter((name) => name === 'rounded-element')).toHaveLength(3)
  })

  it('reaches every site the acceptance run has to name', () => {
    // Counted in the tree: `rounded-element` is written in 14 tracked files over
    // 18 lines, four of which are prose — two in a docblock in
    // packages/shared/src/cn.ts and two in packages/ui/README.md — which this
    // does not read and README.md records as a blind spot. That leaves 14 sites
    // over 12 files, and a floor rather than an equality so that using the class
    // once more is not a failing test.
    const tracked = execFileSync('git', ['ls-files', '-z', 'apps', 'packages'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    })
      .split('\0')
      .filter((file) => /\.tsx?$/.test(file))

    const sites = tracked.flatMap((file) =>
      namesFrom(file)
        .filter((name) => name === 'rounded-element')
        .map(() => file),
    )

    expect(sites.length).toBeGreaterThanOrEqual(14)
    expect(new Set(sites).size).toBeGreaterThanOrEqual(12)
  })
})
