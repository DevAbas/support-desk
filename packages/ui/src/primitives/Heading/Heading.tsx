import { cn } from '@support-desk/shared'
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
 * a heading is chosen by what it is rather than reassembled out of a raw size
 * and a weight at every call site — which is how six screens ended up with six
 * copies of the same title.
 *
 * The raw size is not named here on purpose. Tailwind scans this file as text,
 * comments included, so a class written in prose is compiled as though it were
 * used — the same trap `apps/web/src/index.css` excludes Markdown for.
 */
export function Heading({ level = 'section', as, className, ...props }: HeadingProps) {
  const Element = as ?? defaultElement[level]

  return <Element className={cn(levelClasses[level], className)} {...props} />
}
