import { cn } from '@harness-sample/shared'
import type { HeadingElement, HeadingLevel, HeadingProps } from './Heading.types'

// Keyed by the union, so adding a level without styling it is a type error.
const levelClasses: Record<HeadingLevel, string> = {
  page: 'text-title text-fg',
  section: 'text-section text-fg',
  subsection: 'text-subsection text-fg',
}

/** What each level is, in the document, when nobody says otherwise. */
const defaultElement: Record<HeadingLevel, HeadingElement> = {
  page: 'h1',
  section: 'h2',
  subsection: 'h3',
}

/**
 * A heading.
 *
 * The size, the line height and the weight all come from one semantic token, so
 * a heading is chosen by what it is rather than assembled out of `text-2xl` and
 * `font-semibold` — which is how six screens ended up with six copies of the
 * same title.
 */
export function Heading({ level = 'section', as, className, ...props }: HeadingProps) {
  const Element = as ?? defaultElement[level]

  return <Element className={cn(levelClasses[level], className)} {...props} />
}
