import {
  Button,
  Input,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/design-system'
import { MAX_TAXONOMY_ENTRIES, MAX_TAXONOMY_VALUE_LENGTH, type TicketAppearance } from '@harness-sample/shared'
import { appearanceOptions } from '@/features/taxonomy/appearance'
import { TaxonomyBadge } from '@/features/taxonomy/TaxonomyBadge'
import { validateEntries, type DraftEntry } from './taxonomyDraft'

interface TaxonomyEditorProps {
  /** "status" or "priority", used in every accessible name on the table. */
  noun: string
  caption: string
  /** Shown under the table: what the order of this set means. */
  hint: string
  valuePlaceholder: string
  entries: readonly DraftEntry[]
  /** How many tickets hold each saved value. A new entry is absent, not zero. */
  usage: Readonly<Record<string, number>>
  disabled: boolean
  onChange: (key: string, patch: Partial<DraftEntry>) => void
  onMove: (index: number, direction: -1 | 1) => void
  onRemove: (entry: DraftEntry) => void
  onAdd: () => void
}

/**
 * One editable set.
 *
 * The controls are the design system's, with their labels visually hidden and
 * the column headers doing the naming on screen — every field still has a real
 * label bound to it, and it names its row so that "Label for Open" is what a
 * screen reader announces rather than four fields all called "Label".
 */
export function TaxonomyEditor({
  noun,
  caption,
  hint,
  valuePlaceholder,
  entries,
  usage,
  disabled,
  onChange,
  onMove,
  onRemove,
  onAdd,
}: TaxonomyEditorProps) {
  const errors = validateEntries(entries)
  // The last one cannot go: a ticket has to have something to hold.
  const canRemove = entries.length > 1

  return (
    <div className="flex flex-col gap-4">
      <Table caption={caption}>
        <TableHead>
          <TableRow>
            <TableHeaderCell className="w-40">Value</TableHeaderCell>
            <TableHeaderCell>Label</TableHeaderCell>
            <TableHeaderCell className="w-40">Appearance</TableHeaderCell>
            <TableHeaderCell className="w-28">Preview</TableHeaderCell>
            <TableHeaderCell className="w-20">Tickets</TableHeaderCell>
            <TableHeaderCell className="w-36">Actions</TableHeaderCell>
          </TableRow>
        </TableHead>

        <TableBody columnCount={6}>
          {entries.map((entry, index) => {
            const name = entry.value === '' ? `new ${noun}` : entry.value
            const inUse = usage[entry.value] ?? 0

            return (
              <TableRow key={entry.key} className="align-top">
                <TableCell>
                  {entry.isNew ? (
                    <Input
                      label={`Value for ${name}`}
                      labelHidden
                      value={entry.value}
                      error={errors[entry.key]?.value}
                      maxLength={MAX_TAXONOMY_VALUE_LENGTH}
                      placeholder={valuePlaceholder}
                      disabled={disabled}
                      className="font-mono text-xs"
                      onChange={(event) => onChange(entry.key, { value: event.target.value })}
                    />
                  ) : (
                    // Fixed once saved: changing it would orphan every ticket
                    // holding it, which is what removing-and-reassigning is for.
                    <span className="font-mono text-xs text-fg-muted">{entry.value}</span>
                  )}
                </TableCell>

                <TableCell>
                  <Input
                    label={`Label for ${name}`}
                    labelHidden
                    value={entry.label}
                    error={errors[entry.key]?.label}
                    disabled={disabled}
                    onChange={(event) => onChange(entry.key, { label: event.target.value })}
                  />
                </TableCell>

                <TableCell>
                  <Select
                    label={`Appearance for ${name}`}
                    labelHidden
                    options={appearanceOptions}
                    value={entry.appearance}
                    disabled={disabled}
                    onChange={(event) =>
                      onChange(entry.key, { appearance: event.target.value as TicketAppearance })
                    }
                  />
                </TableCell>

                <TableCell>
                  <TaxonomyBadge
                    entries={[{ ...entry, label: entry.label.trim() || entry.value }]}
                    value={entry.value}
                  />
                </TableCell>

                <TableCell className="text-sm text-fg-muted">
                  {entry.isNew ? '—' : inUse}
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Move ${name} up`}
                      disabled={disabled || index === 0}
                      onClick={() => onMove(index, -1)}
                    >
                      &#8593;
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Move ${name} down`}
                      disabled={disabled || index === entries.length - 1}
                      onClick={() => onMove(index, 1)}
                    >
                      &#8595;
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove ${name}`}
                      disabled={disabled || !canRemove}
                      onClick={() => onRemove(entry)}
                    >
                      Remove
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between gap-4 px-1">
        <p className="text-sm text-fg-muted">{hint}</p>
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled || entries.length >= MAX_TAXONOMY_ENTRIES}
          onClick={onAdd}
        >
          Add {noun}
        </Button>
      </div>
    </div>
  )
}
