import type { ComponentPropsWithRef } from 'react'

/**
 * Every icon the product draws.
 *
 * A closed union rather than the library's thousand names, for the same reason
 * `ChartTone` is a closed union: it is the list this design system has decided
 * on, and adding to it is a deliberate act. It also means feature code never has
 * to know what the library calls anything.
 */
export type IconName =
  | 'arrow-down'
  | 'arrow-left'
  | 'arrow-right'
  | 'arrow-up'
  | 'chevron-down'
  | 'close'
  | 'pencil'

/** Sizes come from the spacing scale, not from the text an icon sits beside. */
export type IconSize = 'sm' | 'md' | 'lg'

/**
 * How loud an icon is.
 *
 * `inherit` is the default and takes the colour of the text around it, which is
 * what an icon inside a sentence or inside a `Button` wants: it is part of the
 * thing it sits in. The other three come from the icon colour scale in
 * `tokens.css`, which exists so that an icon can be quieter than the words
 * beside it — a scale it could not reach while `currentColor` was the only
 * answer it had.
 */
export type IconTone = 'inherit' | 'primary' | 'secondary' | 'disabled'

/** `children` is omitted: what an icon draws follows from `name`. */
export interface IconProps extends Omit<ComponentPropsWithRef<'svg'>, 'children'> {
  name: IconName
  size?: IconSize
  /**
   * The colour, off the icon scale rather than off the text scale.
   *
   * Defaults to `inherit`, so an icon that says nothing about its tone still
   * takes the colour of whatever it is inside.
   */
  tone?: IconTone
  /**
   * What the icon means, in words.
   *
   * Required, so an icon cannot be rendered without someone having decided what
   * it says. An icon-only control is therefore named by its icon even where the
   * control itself was given no `aria-label`.
   */
  label: string
  /**
   * Hides the icon from assistive technology.
   *
   * Set it wherever the meaning is already written beside the icon, or where the
   * control around it carries its own `aria-label` — hearing the same thing
   * twice is worse than not seeing the picture.
   */
  decorative?: boolean
}
