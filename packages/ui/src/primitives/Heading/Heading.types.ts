import type { ComponentPropsWithRef } from 'react'

/**
 * How much weight a heading carries, in the vocabulary of the screen rather than
 * in pixels: one `page` heading at the top of a screen, a `section` heading on a
 * card or a dialog, a `subsection` heading on a group inside one.
 *
 * These are presentation levels. They are not the document outline — see `as`.
 */
export type HeadingLevel = 'page' | 'section' | 'subsection'

export type HeadingElement = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

export interface HeadingProps extends ComponentPropsWithRef<'h2'> {
  level?: HeadingLevel
  /**
   * The element to render, when the outline and the weight disagree.
   *
   * They are two different questions — how important this looks, and where it
   * sits in the document — and answering one should not answer the other. A
   * card's heading inside a page is an `h2` that could be an `h3`; a drawer's
   * title looks like a section heading and is the top of its own subtree.
   */
  as?: HeadingElement
}
