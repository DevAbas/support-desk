import type { ComponentPropsWithRef } from 'react'

export type AvatarSize = 'sm' | 'md' | 'lg'

/** `children` is omitted: what an avatar draws follows from `name` and `src`. */
export interface AvatarProps extends Omit<ComponentPropsWithRef<'span'>, 'children'> {
  /** Who this is a picture of. Drawn as initials whenever there is no picture. */
  name: string
  /** A picture of them, or null. Falling back to initials is the normal case. */
  src?: string | null
  size?: AvatarSize
  /**
   * Hides the avatar from assistive technology.
   *
   * Set it wherever the name is already written beside the avatar — a list row,
   * a detail header — so that the same person is not announced twice. Leave it
   * off when the avatar stands alone and is the only thing carrying the name.
   */
  decorative?: boolean
}
