import { useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  ConfirmDialog,
  Icon,
  StateMessage,
} from '@support-desk/ui'
import { SavedViewNameDialog } from './SavedViewNameDialog'
import type { SavedViewSummary, SavedViewsPanel } from './savedViews.types'

/**
 * The saved views on a screen, beside it.
 *
 * One sidebar for every screen that has them. It knows about a list of names,
 * which one is selected and whether the filters have drifted from it, and it
 * knows nothing at all about what a filter is — the two words it says that are
 * not the same on every screen, the name of the "everything" row and the
 * sentence describing what is about to be stored, arrive as props from the
 * screen's scope.
 */

type Dialog =
  | { kind: 'save' }
  | { kind: 'rename'; view: SavedViewSummary }
  | { kind: 'delete'; view: SavedViewSummary }

const rowClasses = 'min-w-0 flex-1 justify-start gap-2'

export function SavedViewsSidebar({
  allLabel,
  filtersDescription,
  views,
  activeViewId,
  isModified,
  onSelectView,
  onSaveView,
  onRenameView,
  onDeleteView,
}: SavedViewsPanel) {
  const [dialog, setDialog] = useState<Dialog | null>(null)

  function closeDialog() {
    setDialog(null)
  }

  return (
    <aside aria-label="Saved views" className="lg:w-64 lg:shrink-0">
      <Card>
        <CardHeader title="Saved views" description="Filter combinations you come back to." />

        <CardBody className="p-2">
          <ul role="list" className="flex flex-col gap-1">
            <li className="flex items-center gap-1">
              <ViewButton
                name={allLabel}
                isActive={activeViewId === null}
                isModified={isModified}
                onSelect={() => onSelectView(null)}
              />
            </li>

            {views.map((view) => (
              <SavedViewRow
                key={view.id}
                view={view}
                isActive={view.id === activeViewId}
                isModified={isModified}
                onSelect={() => onSelectView(view.id)}
                onRename={() => setDialog({ kind: 'rename', view })}
                onDelete={() => setDialog({ kind: 'delete', view })}
              />
            ))}
          </ul>

          {views.length === 0 ? (
            // The same empty state every list shows, at the size a sidebar has
            // room for and aligned with the rows above it rather than centred.
            <StateMessage className="px-3 py-2 text-left">
              No saved views yet. Set the filters you want, then save them.
            </StateMessage>
          ) : null}
        </CardBody>

        <CardFooter>
          <Button size="sm" onClick={() => setDialog({ kind: 'save' })}>
            Save current filters
          </Button>
        </CardFooter>
      </Card>

      {dialog?.kind === 'save' ? (
        <SavedViewNameDialog
          title="Save this view"
          description={filtersDescription}
          confirmLabel="Save view"
          takenNames={views.map((view) => view.name)}
          onConfirm={(name) => {
            onSaveView(name)
            closeDialog()
          }}
          onClose={closeDialog}
        />
      ) : null}

      {dialog?.kind === 'rename' ? (
        <SavedViewNameDialog
          title="Rename view"
          confirmLabel="Save name"
          initialName={dialog.view.name}
          // Its own name is not taken, so keeping it is not a clash.
          takenNames={views.filter((view) => view.id !== dialog.view.id).map((view) => view.name)}
          onConfirm={(name) => {
            onRenameView(dialog.view.id, name)
            closeDialog()
          }}
          onClose={closeDialog}
        />
      ) : null}

      {dialog?.kind === 'delete' ? (
        <ConfirmDialog
          open
          onClose={closeDialog}
          onConfirm={() => {
            onDeleteView(dialog.view.id)
            closeDialog()
          }}
          title="Delete saved view"
          description={`This removes “${dialog.view.name}”. The filters on screen stay as they are.`}
          confirmLabel="Delete view"
          isDanger
        />
      ) : null}
    </aside>
  )
}

interface ViewButtonProps {
  name: string
  isActive: boolean
  isModified: boolean
  onSelect: () => void
}

/**
 * A row that selects something: a saved view, or the everything the screen shows
 * without one. The badge is on this rather than beside it because the drift it
 * reports is drift from *this* row, and it is only ever drawn on the active one.
 */
function ViewButton({ name, isActive, isModified, onSelect }: ViewButtonProps) {
  return (
    <Button
      variant={isActive ? 'selected' : 'ghost'}
      size="sm"
      aria-current={isActive ? 'true' : undefined}
      className={rowClasses}
      onClick={onSelect}
    >
      <span className="truncate">{name}</span>
      {isActive && isModified ? <Badge status="warning">Modified</Badge> : null}
    </Button>
  )
}

interface SavedViewRowProps {
  view: SavedViewSummary
  isActive: boolean
  isModified: boolean
  onSelect: () => void
  onRename: () => void
  onDelete: () => void
}

/** A saved view: selecting it, and the two things that can be done to it. */
function SavedViewRow({
  view,
  isActive,
  isModified,
  onSelect,
  onRename,
  onDelete,
}: SavedViewRowProps) {
  return (
    <li className="flex items-center gap-1">
      <ViewButton name={view.name} isActive={isActive} isModified={isModified} onSelect={onSelect} />
      <Button
        variant="ghost"
        size="sm"
        className="px-2"
        aria-label={`Rename ${view.name}`}
        onClick={onRename}
      >
        <Icon name="pencil" size="sm" label={`Rename ${view.name}`} decorative />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="px-2"
        aria-label={`Delete ${view.name}`}
        onClick={onDelete}
      >
        <Icon name="close" size="sm" label={`Delete ${view.name}`} decorative />
      </Button>
    </li>
  )
}
