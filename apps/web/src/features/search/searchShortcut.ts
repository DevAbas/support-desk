/**
 * The keyboard shortcut, and the words for it.
 *
 * **Control or Command and K.** It is what every tool an agent already has open
 * uses for exactly this control, so the one thing nobody has to be taught is the
 * way in. The alternative convention is a bare slash, and this app cannot have
 * it: there is a text field on every screen — the ticket filter, the customer
 * search, a comment box — and a bare key would have to be suppressed inside each
 * of them, which is a rule that gets forgotten by the next field somebody adds.
 * `K` with a modifier is also one of the few combinations no browser has already
 * claimed, unlike `L`, `F` and `P`.
 *
 * Both modifiers are accepted rather than one per platform, because a shortcut
 * that works is worth more than a shortcut that is pure: nobody presses Control
 * on a Mac by accident, and a Mac keyboard rented for the afternoon is a real
 * thing. Only the *hint* picks a side.
 */

/** Written out rather than drawn: a screen reader says "Cmd", not a clover. */
const APPLE_HINT = 'Cmd K'

const OTHER_HINT = 'Ctrl K'

/**
 * Read once, at module load. The platform does not change under a tab, and
 * `navigator.platform` — the thing this would otherwise ask — is deprecated.
 */
export const SEARCH_SHORTCUT_HINT = /Mac|iPhone|iPad|iPod/.test(navigator.userAgent)
  ? APPLE_HINT
  : OTHER_HINT

export function matchesSearchShortcut(event: KeyboardEvent): boolean {
  return (event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'k'
}
