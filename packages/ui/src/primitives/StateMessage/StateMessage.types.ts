import type { ComponentPropsWithRef } from 'react'

export interface StateMessageProps extends ComponentPropsWithRef<'div'> {
  /**
   * Announces the message politely while it is true.
   *
   * Waiting is a thing that is happening, and it has to be said; there being
   * nothing is a fact about what is on screen, and reading it is enough.
   */
  isLoading?: boolean
}
