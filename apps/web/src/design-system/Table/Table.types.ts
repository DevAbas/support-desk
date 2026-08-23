import type { ComponentPropsWithRef, ReactNode } from 'react'

export interface TableProps extends ComponentPropsWithRef<'table'> {
  /** Describes the table for screen readers. Rendered visually hidden. */
  caption: string
}

export type TableHeadProps = ComponentPropsWithRef<'thead'>

export interface TableBodyProps extends ComponentPropsWithRef<'tbody'> {
  /** Number of columns, used to span the loading and empty rows. */
  columnCount: number
  isLoading?: boolean
  isEmpty?: boolean
  loadingMessage?: ReactNode
  emptyMessage?: ReactNode
}

export type TableRowProps = ComponentPropsWithRef<'tr'>

export type TableHeaderCellProps = ComponentPropsWithRef<'th'>

export type TableCellProps = ComponentPropsWithRef<'td'>
