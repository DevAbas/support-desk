import type { ComponentPropsWithRef } from 'react'

/**
 * Which edge the strip draws, which follows from where it sits rather than from
 * taste: a strip above what it acts on separates itself with its `bottom` edge,
 * one below with its `top`. `none` is for a strip between two others that
 * already draw one, where a second line would be a double rule.
 */
export type ToolbarDivider = 'top' | 'bottom' | 'none'

/**
 * The element. A strip that is a landmark in its own right — pagination, which
 * a reader navigates by — is a `nav`; everything else is a `div`.
 *
 * Deliberately not `role="toolbar"`, whatever the component is called. That role
 * is a promise about the keyboard: one tab stop for the whole strip, with the
 * arrow keys moving between the controls inside it. None of these strips does
 * that, and claiming it would leave a reader pressing arrow keys at a row that
 * does not answer.
 */
export type ToolbarElement = 'div' | 'nav'

export interface ToolbarProps extends ComponentPropsWithRef<'div'> {
  divider?: ToolbarDivider
  as?: ToolbarElement
}
