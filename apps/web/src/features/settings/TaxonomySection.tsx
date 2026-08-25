import { useState } from 'react'
import { Button, Card, CardBody, CardFooter, CardHeader, Modal, Select } from '@/design-system'
import { toErrorMessage, ApiError } from '@/lib/api/http'
import type { TaxonomyReassign } from '@harness-sample/shared'
import { toValueOptions } from '@/features/taxonomy/taxonomyOptions'
import { useTaxonomy } from '@/features/taxonomy/useTaxonomy'
import { useUpdateTaxonomy } from '@/features/taxonomy/useUpdateTaxonomy'
import { TaxonomyEditor } from './TaxonomyEditor'
import {
  createDraftEntry,
  fromDraft,
  hasDraftErrors,
  moveEntry,
  toDraft,
  type DraftEntry,
  type DraftSets,
  type TaxonomyKind,
} from './taxonomyDraft'

const EMPTY_REASSIGN: TaxonomyReassign = { statuses: {}, priorities: {} }

/** The removal waiting on somewhere to send the tickets that hold it. */
interface PendingRemoval {
  kind: TaxonomyKind
  entry: DraftEntry
  count: number
}

/**
 * The statuses and priorities, as an admin edits them.
 *
 * Both sets are saved together, because the API replaces the taxonomy whole:
 * order is part of what is being edited, and a removal only means anything
 * against a complete list.
 *
 * The screen holds edits locally and sends them on save rather than on every
 * keystroke. Half-typed values are not worth a round trip, and a removal is not
 * a decision until it is confirmed.
 */
export function TaxonomySection() {
  const query = useTaxonomy()
  const save = useUpdateTaxonomy()

  const [edits, setEdits] = useState<DraftSets | null>(null)
  const [reassign, setReassign] = useState<TaxonomyReassign>(EMPTY_REASSIGN)
  const [removing, setRemoving] = useState<PendingRemoval | null>(null)
  const [removeTarget, setRemoveTarget] = useState('')
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  // Derived rather than copied in with an effect: until something is edited,
  // what is on screen is simply what the query holds.
  const draft = edits ?? (query.data ? toDraft(query.data.taxonomy) : null)
  const usage = query.data?.usage ?? { statuses: {}, priorities: {} }

  const isDirty =
    draft !== null &&
    query.data !== undefined &&
    JSON.stringify(fromDraft(draft)) !== JSON.stringify(query.data.taxonomy)

  const isBusy = save.isPending
  const canSave = draft !== null && isDirty && !isBusy && !hasDraftErrors(draft)

  const loadError = query.isError
    ? toErrorMessage(query.error, 'Could not load the statuses and priorities.')
    : null

  // The server names every value that still needs somewhere to go; those belong
  // under the button rather than on any one field.
  const saveError = save.isError ? toErrorMessage(save.error, 'Could not save.') : null
  const saveDetails = save.error instanceof ApiError ? save.error.details : []

  function editSet(kind: TaxonomyKind, next: DraftEntry[]) {
    if (!draft) {
      return
    }

    setSavedMessage(null)
    setEdits({ ...draft, [kind]: next })
  }

  function changeEntry(kind: TaxonomyKind, key: string, patch: Partial<DraftEntry>) {
    if (!draft) {
      return
    }

    editSet(
      kind,
      draft[kind].map((entry) => (entry.key === key ? { ...entry, ...patch } : entry)),
    )
  }

  function removeEntry(kind: TaxonomyKind, key: string) {
    if (!draft) {
      return
    }

    editSet(
      kind,
      draft[kind].filter((entry) => entry.key !== key),
    )
  }

  function requestRemove(kind: TaxonomyKind, entry: DraftEntry) {
    const count = entry.isNew ? 0 : (usage[kind][entry.value] ?? 0)

    // Nothing holds it, so there is nothing to decide.
    if (count === 0) {
      removeEntry(kind, entry.key)
      return
    }

    setRemoving({ kind, entry, count })
    setRemoveTarget('')
  }

  function confirmRemove() {
    if (!removing || removeTarget === '') {
      return
    }

    const { kind, entry } = removing

    setReassign((current) => {
      // An earlier removal may have been sent to the value being removed now.
      // Following it along keeps every ticket pointing at something that will
      // still exist once this is saved.
      const followed = Object.fromEntries(
        Object.entries(current[kind]).map(([from, to]) => [
          from,
          to === entry.value ? removeTarget : to,
        ]),
      )

      return { ...current, [kind]: { ...followed, [entry.value]: removeTarget } }
    })

    removeEntry(kind, entry.key)
    setRemoving(null)
  }

  function discard() {
    setEdits(null)
    setReassign(EMPTY_REASSIGN)
    setSavedMessage(null)
    save.reset()
  }

  function handleSave() {
    if (!draft || !canSave) {
      return
    }

    save.mutate(
      { taxonomy: fromDraft(draft), reassign },
      {
        onSuccess: (result) => {
          setEdits(null)
          setReassign(EMPTY_REASSIGN)
          setSavedMessage(
            result.migrated === 0
              ? 'Saved.'
              : `Saved. ${String(result.migrated)} ${
                  result.migrated === 1 ? 'ticket was' : 'tickets were'
                } moved onto another value.`,
          )
        },
      },
    )
  }

  const remainingOptions = removing
    ? toValueOptions(
        (draft?.[removing.kind] ?? [])
          .filter((entry) => entry.key !== removing.entry.key && entry.value !== '')
          .map(({ value, label, appearance }) => ({ value, label: label.trim() || value, appearance })),
      )
    : []

  return (
    <Card>
      <CardHeader
        title="Ticket statuses and priorities"
        description="What a ticket can be set to, how each one reads, and the order they are offered in."
      />

      <CardBody className="flex flex-col gap-8">
        {loadError ? (
          <div className="flex items-center justify-between gap-4 rounded-md border border-danger-border bg-danger-subtle px-4 py-3">
            <p className="text-sm text-danger-subtle-fg">{loadError}</p>
            <Button variant="secondary" size="sm" onClick={() => void query.refetch()}>
              Try again
            </Button>
          </div>
        ) : null}

        {query.isPending ? (
          <p role="status" aria-live="polite" className="text-sm text-fg-muted">
            Loading statuses and priorities…
          </p>
        ) : null}

        {draft ? (
          <>
            <section className="flex flex-col gap-4">
              <h3 className="text-base font-semibold text-fg">Statuses</h3>
              <TaxonomyEditor
                noun="status"
                caption="Ticket statuses"
                hint="The first status is the one a new ticket opens in."
                valuePlaceholder="e.g. escalated"
                entries={draft.statuses}
                usage={usage.statuses}
                disabled={isBusy}
                onChange={(key, patch) => changeEntry('statuses', key, patch)}
                onMove={(index, direction) =>
                  editSet('statuses', moveEntry(draft.statuses, index, direction))
                }
                onRemove={(entry) => requestRemove('statuses', entry)}
                onAdd={() => editSet('statuses', [...draft.statuses, createDraftEntry()])}
              />
            </section>

            <section className="flex flex-col gap-4">
              <h3 className="text-base font-semibold text-fg">Priorities</h3>
              <TaxonomyEditor
                noun="priority"
                caption="Ticket priorities"
                hint="The order here is the order the priority dropdown offers."
                valuePlaceholder="e.g. urgent"
                entries={draft.priorities}
                usage={usage.priorities}
                disabled={isBusy}
                onChange={(key, patch) => changeEntry('priorities', key, patch)}
                onMove={(index, direction) =>
                  editSet('priorities', moveEntry(draft.priorities, index, direction))
                }
                onRemove={(entry) => requestRemove('priorities', entry)}
                onAdd={() => editSet('priorities', [...draft.priorities, createDraftEntry()])}
              />
            </section>
          </>
        ) : null}
      </CardBody>

      <CardFooter className="flex-wrap justify-between">
        <div className="flex flex-col gap-1">
          {saveError ? (
            <p role="alert" className="text-sm text-danger">
              {saveError}
            </p>
          ) : null}
          {saveDetails.map((detail) => (
            <p key={detail} className="text-xs text-danger">
              {detail}
            </p>
          ))}
          {savedMessage ? (
            <p role="status" className="text-sm text-success">
              {savedMessage}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={discard} disabled={!isDirty || isBusy}>
            Discard changes
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {isBusy ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </CardFooter>

      <Modal
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title={`Remove ${removing?.entry.label.trim() ?? ''}`}
        description={
          removing
            ? `${String(removing.count)} ${
                removing.count === 1 ? 'ticket is' : 'tickets are'
              } set to this. Choose what to move them to — it is applied when you save.`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmRemove} disabled={removeTarget === ''}>
              Remove and move
            </Button>
          </>
        }
      >
        <Select
          label="Move those tickets to"
          options={remainingOptions}
          value={removeTarget}
          placeholder="Choose one"
          onChange={(event) => setRemoveTarget(event.target.value)}
        />
      </Modal>
    </Card>
  )
}
