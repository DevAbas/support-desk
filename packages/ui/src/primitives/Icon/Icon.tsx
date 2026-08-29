import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  Pencil,
  X,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@harness-sample/shared'
import type { IconName, IconProps, IconSize } from './Icon.types'

/**
 * An icon.
 *
 * This is the only file in the codebase that imports the icon library, the same
 * arrangement `Chart/` has with the charting library. Feature code names an
 * icon through `IconName` and reads nothing of the library's API, so replacing
 * the library is a change to this table rather than to every screen that draws
 * something.
 *
 * Keyed by the union, so adding a name without wiring it is a type error.
 */
const icons: Record<IconName, LucideIcon> = {
  'arrow-down': ArrowDown,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'arrow-up': ArrowUp,
  'chevron-down': ChevronDown,
  close: X,
  pencil: Pencil,
}

/**
 * An icon is drawn at a size from the spacing scale, not at the size of the text
 * it happens to sit next to. A glyph in a sentence inherits the sentence; an
 * icon is a picture, and a picture that changes size with its caption is a
 * picture nobody can lay out.
 */
const sizeClasses: Record<IconSize, string> = {
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-6',
}

export function Icon({ name, size = 'md', label, decorative = false, className, ...props }: IconProps) {
  const Glyph = icons[name]

  return (
    <Glyph
      aria-hidden={decorative ? true : undefined}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : label}
      // Never a tab stop: SVG is focusable by default in some browsers.
      focusable="false"
      className={cn('shrink-0', sizeClasses[size], className)}
      {...props}
    />
  )
}
