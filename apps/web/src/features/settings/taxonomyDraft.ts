import {
  MAX_TAXONOMY_LABEL_LENGTH,
  RESERVED_TAXONOMY_VALUES,
  TAXONOMY_VALUE_PATTERN,
  type Taxonomy,
  type TaxonomyEntry,
} from '@harness-sample/shared'

/**
 * The editor's working copy of the taxonomy.
 *
 * Two things are true of a row being edited that are not true of a saved entry,
 * and both are why this is a separate shape rather than `TaxonomyEntry[]`:
 *
 * - A row needs an identity that survives its value being typed. Keying on the
 *   value itself would remount the field on every keystroke of a new entry, and
 *   two blank new rows would share a key.
 * - A value can only be chosen once. Editing one on a saved entry would orphan
 *   every ticket holding it, so the field is only editable while the row is new.
 */
export interface DraftEntry extends TaxonomyEntry {
  key: string
  isNew: boolean
}

export interface DraftSets {
  statuses: DraftEntry[]
  priorities: DraftEntry[]
}

/** Which set is being edited. Also the key into `Taxonomy` and into the reassign map. */
export type TaxonomyKind = keyof DraftSets

export const TAXONOMY_KINDS: readonly TaxonomyKind[] = ['statuses', 'priorities']

export function toDraft(taxonomy: Taxonomy): DraftSets {
  return {
    statuses: taxonomy.statuses.map(toDraftEntry),
    priorities: taxonomy.priorities.map(toDraftEntry),
  }
}

function toDraftEntry(entry: TaxonomyEntry): DraftEntry {
  return { ...entry, key: entry.value, isNew: false }
}

export function fromDraft(draft: DraftSets): Taxonomy {
  return {
    statuses: draft.statuses.map(toEntry),
    priorities: draft.priorities.map(toEntry),
  }
}

function toEntry({ value, label, appearance }: DraftEntry): TaxonomyEntry {
  return { value: value.trim(), label: label.trim(), appearance }
}

let nextNewKey = 0

/** `crypto.randomUUID` needs a secure context, which a LAN dev server is not. */
export function createDraftEntry(): DraftEntry {
  nextNewKey += 1

  return { key: `new-${String(nextNewKey)}`, isNew: true, value: '', label: '', appearance: 'neutral' }
}

/** Moves an entry one place, or returns the list untouched at either end. */
export function moveEntry(
  entries: readonly DraftEntry[],
  index: number,
  direction: -1 | 1,
): DraftEntry[] {
  const target = index + direction
  const moved = entries[index]
  const displaced = entries[target]

  if (!moved || !displaced) {
    return [...entries]
  }

  const next = [...entries]
  next[index] = displaced
  next[target] = moved

  return next
}

export interface DraftEntryErrors {
  value?: string
  label?: string
}

/**
 * What the server would refuse, checked here so it lands on the field rather
 * than arriving as a list of messages under the button.
 *
 * The server checks all of this again — it is the one that owns the rule — but
 * an admin should not have to round-trip to find out that a label is empty.
 */
export function validateEntries(
  entries: readonly DraftEntry[],
): Record<string, DraftEntryErrors> {
  const errors: Record<string, DraftEntryErrors> = {}
  const seen = new Map<string, number>()

  for (const entry of entries) {
    const value = entry.value.trim()
    seen.set(value, (seen.get(value) ?? 0) + 1)
  }

  for (const entry of entries) {
    const value = entry.value.trim()
    const label = entry.label.trim()
    const entryErrors: DraftEntryErrors = {}

    if (value === '') {
      entryErrors.value = 'A value is required.'
    } else if (!TAXONOMY_VALUE_PATTERN.test(value)) {
      entryErrors.value = 'Use lowercase letters, digits and hyphens.'
    } else if (RESERVED_TAXONOMY_VALUES.some((reserved) => reserved === value)) {
      entryErrors.value = `"${value}" is reserved for "do not filter on this".`
    } else if ((seen.get(value) ?? 0) > 1) {
      entryErrors.value = 'This value is already used.'
    }

    if (label === '') {
      entryErrors.label = 'A label is required.'
    } else if (label.length > MAX_TAXONOMY_LABEL_LENGTH) {
      entryErrors.label = `Use at most ${String(MAX_TAXONOMY_LABEL_LENGTH)} characters.`
    }

    if (entryErrors.value ?? entryErrors.label) {
      errors[entry.key] = entryErrors
    }
  }

  return errors
}

export function hasDraftErrors(draft: DraftSets): boolean {
  return TAXONOMY_KINDS.some((kind) => Object.keys(validateEntries(draft[kind])).length > 0)
}
