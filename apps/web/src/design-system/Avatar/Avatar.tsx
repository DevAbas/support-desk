import { useState } from 'react'
import { cn } from '@/lib/cn'
import type { AvatarProps, AvatarSize } from './Avatar.types'

const baseClasses =
  'inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-medium'

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'size-8 text-xs',
  md: 'size-10 text-sm',
  lg: 'size-14 text-lg',
}

/**
 * The tones initials are drawn in.
 *
 * These carry no meaning. A tone here does not say a customer is in trouble the
 * way a danger `Badge` does — it is picked from the name so that the same person
 * is the same colour on every screen, and for no other reason. That is why it is
 * derived rather than passed in: a caller choosing one would be a caller saying
 * something by it.
 */
const toneClasses: readonly string[] = [
  'bg-primary-subtle text-primary-subtle-fg',
  'bg-info-subtle text-info-subtle-fg',
  'bg-success-subtle text-success-subtle-fg',
  'bg-warning-subtle text-warning-subtle-fg',
  'bg-danger-subtle text-danger-subtle-fg',
  'bg-muted text-muted-fg',
]

function toneFor(name: string): string {
  const sum = [...name].reduce((total, character) => total + (character.codePointAt(0) ?? 0), 0)

  return toneClasses[sum % toneClasses.length] as string
}

/**
 * The first letter of the first and last word, so "Priya Raman" is PR and a
 * one-word name is a single letter rather than a padded one.
 */
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter((word) => word !== '')
  const first = words.at(0)?.at(0) ?? ''
  const last = words.length > 1 ? (words.at(-1)?.at(0) ?? '') : ''

  return `${first}${last}`.toUpperCase()
}

/**
 * A picture of a person, or their initials when there is no picture.
 *
 * Both paths are normal. Most people have not uploaded anything, so initials are
 * what this mostly renders, and a picture that fails to load falls back to them
 * rather than to the browser's broken-image glyph.
 */
export function Avatar({
  name,
  src = null,
  size = 'md',
  decorative = false,
  className,
  ...props
}: AvatarProps) {
  // Which `src` failed, rather than whether one did: a new picture is tried
  // again on its own, without an effect to reset a flag when the prop changes.
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const showImage = src !== null && src !== '' && src !== failedSrc

  return (
    <span
      aria-hidden={decorative ? true : undefined}
      // An image carries its own name through `alt`; initials are a picture
      // only in the sense that they need to be announced as one.
      role={!decorative && !showImage ? 'img' : undefined}
      aria-label={!decorative && !showImage ? name : undefined}
      className={cn(
        baseClasses,
        sizeClasses[size],
        showImage ? 'bg-surface-inset' : toneFor(name),
        className,
      )}
      {...props}
    >
      {showImage ? (
        <img
          src={src}
          alt={decorative ? '' : name}
          className="size-full object-cover"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        initialsOf(name)
      )}
    </span>
  )
}
