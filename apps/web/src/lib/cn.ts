import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

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
