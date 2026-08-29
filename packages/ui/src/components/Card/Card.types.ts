import type { ComponentPropsWithRef, ReactNode } from 'react'
import type { HeadingElement, HeadingLevel } from '../../primitives/Heading'

export type CardProps = ComponentPropsWithRef<'div'>

/** `title` is omitted from the div props: here it is a heading, not a tooltip. */
export interface CardHeaderProps extends Omit<ComponentPropsWithRef<'div'>, 'title'> {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  /**
   * How much weight the title carries. A card in a sidebar and a card filling
   * the screen are not the same size of thing, and before this they had no way
   * to say so.
   */
  level?: HeadingLevel
  /** The heading element, when the outline and the weight disagree. */
  as?: HeadingElement
  /**
   * Ids for the title and description.
   *
   * A dialog names itself with `aria-labelledby` and describes itself with
   * `aria-describedby`, both of which need an element it can point at — which is
   * why `Dialog` can render this header rather than rebuilding it.
   */
  titleId?: string
  descriptionId?: string
  /**
   * Cuts a long title off with an ellipsis rather than wrapping it.
   *
   * A card grows to fit its heading; a drawer is a fixed width with a person's
   * name in it, and cannot.
   */
  truncateTitle?: boolean
}

export type CardBodyProps = ComponentPropsWithRef<'div'>

export type CardFooterProps = ComponentPropsWithRef<'div'>
