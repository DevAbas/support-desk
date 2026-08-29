import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * The semantic type scale, registered as font sizes.
 *
 * tailwind-merge classifies `text-<word>` as a colour, so without this
 * `text-title text-fg` resolves to `text-fg` alone and the size disappears —
 * silently, the way a class that produces no CSS disappears. Naming the tokens
 * here keeps the two `text-` namespaces apart, so a heading can carry both its
 * level and its colour.
 */
const semanticTextSizes = ['title', 'section', 'subsection', 'body', 'caption']

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: semanticTextSizes }],
    },
  },
})

/**
 * Merge Tailwind class names.
 *
 * clsx resolves conditionals and arrays, tailwind-merge then drops earlier
 * classes that later ones override. Always pass the incoming `className` last
 * so a caller can override a primitive's defaults.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
