import type { ComponentPropsWithRef } from 'react'

/** Prose, and the quieter line of meta under it. */
export type TextSize = 'body' | 'caption'

/** How loud the text is, in descending emphasis — the `fg` scale, named. */
export type TextTone = 'default' | 'muted' | 'subtle'

export type TextElement = 'p' | 'span' | 'div'

export interface TextProps extends ComponentPropsWithRef<'p'> {
  size?: TextSize
  tone?: TextTone
  /** A paragraph inside a paragraph is not a paragraph; use `span` there. */
  as?: TextElement
}
