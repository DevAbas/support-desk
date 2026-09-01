import { useEffect, useId, useRef, useState, type RefObject } from 'react'
import { cn } from '@support-desk/shared'
import { Button } from '../../primitives/Button'
import { Icon } from '../../primitives/Icon'
import { Input } from '../../primitives/Input'
import { EMPTY_MESSAGE, LOADING_MESSAGE, StateMessage } from '../../primitives/StateMessage'
import { Text } from '../../primitives/Text'
import { Alert } from '../Alert'
import { Dialog } from '../Dialog'
import { Toolbar } from '../Toolbar'
import type {
  CommandPaletteGroup,
  CommandPaletteOption,
  CommandPaletteProps,
} from './CommandPalette.types'

/**
 * One field over a grouped list of things it can take you to.
 *
 * The third dialog shape, and it is a third for the same reason `Modal` and
 * `Drawer` are two: what differs is not a size. A modal interrupts and a drawer
 * accompanies; a palette is neither — it is a way of reaching something from
 * anywhere, it is over everything while it is open, and it is expected to be
 * dismissed as often as it is used. It shares `Dialog` with both, so the role,
 * the accessible name, Escape, the overlay click, focus moved in and given back,
 * and the trap are the same behaviour and not a third copy of it.
 *
 * **It is a combobox over a listbox, and that decides nearly everything else.**
 * Focus stays in the field the whole time, because every keystroke is a
 * character in the query — including the arrow keys, which move a *pointer* into
 * the list rather than moving focus. That pointer is `aria-activedescendant`,
 * which is why an option is a `div` with `role="option"` and not a `Button`: a
 * button inside a listbox is not an option, and one that took focus would take
 * the next letter typed with it.
 *
 * The cost of that is the one place this component writes something the design
 * system otherwise owns — the active row's fill. `Button`'s `selected` variant
 * is where "this is the one currently chosen" lives, and an option cannot be a
 * `Button`. It is the second thing in this codebase in that position, after the
 * nav link in `AppLayout`, and the shape of the fix is the one `interactive` and
 * `focus-ring` already have: a utility rather than a variant. Until then the
 * fill is written here, and only the fill — the ink stays `fg` and `fg-muted`, so
 * there is no second pairing of a tint with an ink to keep in step with the
 * first.
 */

/** The way out, named once: the button that draws it and the dialog it closes. */
const CLOSE_LABEL = 'Close search'

/**
 * What the keyboard does, in words rather than in arrows.
 *
 * Glyphs would be read out as "upwards arrow, downwards arrow" by the thing most
 * likely to need the sentence, and they are not on the icon scale either.
 */
const KEYBOARD_HINT = 'Arrow keys to move, Enter to open, Escape to close.'

export function CommandPalette({
  open,
  onClose,
  label,
  placeholder,
  value,
  onValueChange,
  groups,
  onSelect,
  isLoading = false,
  loadingMessage = LOADING_MESSAGE,
  emptyMessage = EMPTY_MESSAGE,
  error,
}: CommandPaletteProps) {
  const id = useId()
  const listId = `${id}-results`
  const inputRef = useRef<HTMLInputElement>(null)
  const activeRef = useRef<HTMLDivElement>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

  // The one flat sequence the arrow keys walk, in the order the groups draw.
  const options = groups.flatMap((group) => group.options)

  /**
   * Which option is active, derived rather than stored.
   *
   * The results are replaced on every keystroke, and an index kept in state
   * would point at whatever now happens to sit there. Reading the remembered id
   * back out of the current list means an option that has gone takes the
   * selection back to the top on its own, with no effect to reset it — the same
   * arrangement the customer list's selection uses.
   */
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.id === activeId),
  )
  const active = options[activeIndex]

  const domIds = new Map(
    options.map((option, index) => [option.id, `${id}-option-${String(index)}`]),
  )

  /**
   * Nothing matched — which is not the same as nothing having arrived.
   *
   * There is no empty message under an error, because the reason there is
   * nothing is already on screen above it, and "nothing matches" is a claim
   * about the query that a request which never came back has not earned.
   * Loading wins over both, the same way it does in `StateMessage`'s other
   * callers: nothing having arrived yet is not nothing.
   */
  const isEmpty = !isLoading && options.length === 0 && !error

  /**
   * The field, not the panel.
   *
   * `Dialog` moves focus to its panel on open, and a child's effect runs before
   * its parent's — this component is the parent, so this runs after it and wins.
   * Focus belongs in the field because that is where the query is typed and
   * where the arrow keys are read.
   */
  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
    }
  }, [open])

  // Keeps the active row on screen as the arrow keys walk past the fold.
  useEffect(() => {
    activeRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [activeIndex])

  /** Wraps, because a list with a top and a bottom has neither in a palette. */
  function move(step: number) {
    if (options.length === 0) {
      return
    }

    const next = (activeIndex + step + options.length) % options.length

    setActiveId(options[next]?.id ?? null)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={label}
      closeLabel={CLOSE_LABEL}
      // Near the top rather than centred: the panel grows downwards as results
      // arrive, and a centred one would move under the reader while they type.
      overlayClassName="flex items-start justify-center overflow-y-auto p-4 pt-24 animate-fade-in motion-reduce:animate-none"
      panelClassName="flex w-full max-w-xl flex-col overflow-hidden rounded-container border border-border bg-surface shadow-overlay"
      header={
        <Toolbar>
          <Icon name="search" label="Search" decorative tone="secondary" />

          {/* `Input` sizes itself to its wrapper and the wrapper is a block, so
              the growing is done here. */}
          <div className="min-w-0 flex-1">
            <Input
              ref={inputRef}
              label={label}
              labelHidden
              // Deliberately not `type="search"`, which the other search fields
              // in this app are. A search input answers Escape by clearing
              // itself in some browsers, and Escape here already means close.
              type="text"
              role="combobox"
              aria-expanded={true}
              aria-controls={listId}
              aria-activedescendant={active ? domIds.get(active.id) : undefined}
              aria-autocomplete="list"
              autoComplete="off"
              value={value}
              placeholder={placeholder}
              onChange={(event) => onValueChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault()
                  move(1)
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault()
                  move(-1)
                } else if (event.key === 'Enter' && active) {
                  event.preventDefault()
                  onSelect(active.id)
                }
              }}
            />
          </div>

          <Button variant="ghost" size="sm" onClick={onClose} aria-label={CLOSE_LABEL}>
            <Icon name="close" size="sm" label={CLOSE_LABEL} decorative />
          </Button>
        </Toolbar>
      }
      footer={
        <Text size="caption" tone="muted">
          {KEYBOARD_HINT}
        </Text>
      }
    >
      {error ? (
        <Alert tone="danger" variant="band">
          {error}
        </Alert>
      ) : null}

      <div className="max-h-96 overflow-y-auto">
        {isLoading || isEmpty ? (
          <StateMessage isLoading={isLoading}>
            {isLoading ? loadingMessage : emptyMessage}
          </StateMessage>
        ) : null}

        {/* Rendered whether or not it holds anything, because `aria-controls`
            on the field points at it: a reference to an element that comes and
            goes is a reference that is sometimes to nothing. */}
        <div id={listId} role="listbox" aria-label={`${label} results`}>
          {groups.map((group) => (
            <PaletteGroup
              key={group.id}
              group={group}
              headingId={`${id}-group-${group.id}`}
              domIds={domIds}
              activeOptionId={active?.id ?? null}
              activeRef={activeRef}
              onActivate={setActiveId}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </Dialog>
  )
}

interface PaletteGroupProps {
  group: CommandPaletteGroup
  headingId: string
  domIds: ReadonlyMap<string, string>
  activeOptionId: string | null
  activeRef: RefObject<HTMLDivElement | null>
  onActivate: (optionId: string) => void
  onSelect: (optionId: string) => void
}

function PaletteGroup({
  group,
  headingId,
  domIds,
  activeOptionId,
  activeRef,
  onActivate,
  onSelect,
}: PaletteGroupProps) {
  return (
    <div role="group" aria-labelledby={headingId}>
      <p
        id={headingId}
        className="flex items-baseline justify-between gap-2 px-3 pt-3 pb-1 text-caption font-medium text-fg-muted"
      >
        <span>{group.label}</span>
        {/* Told apart from the heading by weight rather than by colour: the step
            below `fg-muted` is 3.6:1 on a card, which is a disabled icon's
            colour and not a colour for text. */}
        {group.meta ? <span className="font-normal">{group.meta}</span> : null}
      </p>

      {group.options.map((option) => (
        <PaletteOption
          key={option.id}
          option={option}
          domId={domIds.get(option.id) ?? option.id}
          isActive={option.id === activeOptionId}
          activeRef={activeRef}
          onActivate={onActivate}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

interface PaletteOptionProps {
  option: CommandPaletteOption
  domId: string
  isActive: boolean
  activeRef: RefObject<HTMLDivElement | null>
  onActivate: (optionId: string) => void
  onSelect: (optionId: string) => void
}

function PaletteOption({
  option,
  domId,
  isActive,
  activeRef,
  onActivate,
  onSelect,
}: PaletteOptionProps) {
  return (
    <div
      ref={isActive ? activeRef : undefined}
      id={domId}
      role="option"
      aria-selected={isActive}
      // Pointing at a row makes it the active one, so what Enter would open is
      // always what is under the cursor rather than two answers on one screen.
      onMouseMove={() => onActivate(option.id)}
      onClick={() => onSelect(option.id)}
      className={cn(
        'interactive flex cursor-pointer items-center gap-3 px-3 py-1.5 text-left',
        isActive && 'bg-primary-subtle',
      )}
    >
      {option.leading ? (
        <span className="flex shrink-0 items-center">{option.leading}</span>
      ) : null}

      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body font-medium text-fg">{option.title}</span>
        {option.subtitle ? (
          <span className="truncate text-caption text-fg-muted">{option.subtitle}</span>
        ) : null}
      </span>

      {option.trailing ? (
        <span className="flex shrink-0 items-center">{option.trailing}</span>
      ) : null}
    </div>
  )
}
