import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  Pencil,
  Search,
  X,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@harness-sample/shared'
import type { IconName, IconProps, IconSize, IconTone } from './Icon.types'

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
  search: Search,
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

/**
 * Colour comes off the icon scale, which is its own scale and not the text one.
 *
 * `inherit` draws nothing and lets `currentColor` stand, which is what an icon
 * inside a button or inside a sentence wants — it is part of that thing. The
 * other three are for an icon that is not: a chevron on a control, a glyph
 * beside a label it should not be as loud as. Before this scale existed there
 * was no way to say that except by reaching for a text colour, which said the
 * wrong thing about what the icon was.
 *
 * Keyed by the union, so adding a tone without styling it is a type error.
 */
const toneClasses: Record<IconTone, string> = {
  inherit: '',
  primary: 'text-icon-primary',
  secondary: 'text-icon-secondary',
  disabled: 'text-icon-disabled',
}

export function Icon({
  name,
  size = 'md',
  tone = 'inherit',
  label,
  decorative = false,
  className,
  ...props
}: IconProps) {
  const Glyph = icons[name]

  return (
    <Glyph
      aria-hidden={decorative ? true : undefined}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : label}
      // Never a tab stop: SVG is focusable by default in some browsers.
      focusable="false"
      className={cn('shrink-0', sizeClasses[size], toneClasses[tone], className)}
      {...props}
    />
  )
}
