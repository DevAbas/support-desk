import type { ComponentPropsWithRef, ReactNode } from 'react'

export type CardProps = ComponentPropsWithRef<'div'>

/** `title` is omitted from the div props: here it is a heading, not a tooltip. */
export interface CardHeaderProps extends Omit<ComponentPropsWithRef<'div'>, 'title'> {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}

export type CardBodyProps = ComponentPropsWithRef<'div'>

export type CardFooterProps = ComponentPropsWithRef<'div'>
