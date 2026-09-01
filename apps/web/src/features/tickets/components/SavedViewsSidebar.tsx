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
import type { SavedView } from '@/features/tickets/savedViews'
import { SavedViewNameDialog } from './SavedViewNameDialog'

type Dialog =
  | { kind: 'save' }
  | { kind: 'rename'; view: SavedView }
  | { kind: 'delete'; view: SavedView }

interface SavedViewsSidebarProps {
  views: readonly SavedView[]
  /** `null` means no saved view is selected: the list is showing everything. */
  activeViewId: string | null
  /** True when the filters on screen have drifted from what is selected. */
  isModified: boolean
  onSelectView: (view: SavedView | null) => void
  onSaveView: (name: string) => void
  onRenameView: (id: string, name: string) => void
  onDeleteView: (id: string) => void
}

const rowClasses = 'min-w-0 flex-1 justify-start gap-2'

export function SavedViewsSidebar({
  views,
  activeViewId,
  isModified,
  onSelectView,
  onSaveView,
  onRenameView,
  onDeleteView,
}: SavedViewsSidebarProps) {
  const [dialog, setDialog] = useState<Dialog | null>(null)

  function closeDialog() {
    setDialog(null)
  }

  return (
    <aside aria-label="Saved views" className="lg:w-64 lg:shrink-0">
      <Card>
        <CardHeader
          title="Saved views"
          description="Filter combinations you come back to."
        />

        <CardBody className="p-2">
          <ul className="flex flex-col gap-1">
            <li className="flex items-center gap-1">
              <Button
                variant={activeViewId === null ? 'selected' : 'ghost'}
                size="sm"
                aria-current={activeViewId === null ? 'true' : undefined}
                className={rowClasses}
                onClick={() => onSelectView(null)}
              >
                <span className="truncate">All tickets</span>
                {activeViewId === null && isModified ? (
                  <Badge status="warning">Modified</Badge>
                ) : null}
              </Button>
            </li>

            {views.map((view) => {
              const isActive = view.id === activeViewId

              return (
                <li key={view.id} className="flex items-center gap-1">
                  <Button
                    variant={isActive ? 'selected' : 'ghost'}
                    size="sm"
                    aria-current={isActive ? 'true' : undefined}
                    className={rowClasses}
                    onClick={() => onSelectView(view)}
                  >
                    <span className="truncate">{view.name}</span>
                    {isActive && isModified ? <Badge status="warning">Modified</Badge> : null}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-2"
                    aria-label={`Rename ${view.name}`}
                    onClick={() => setDialog({ kind: 'rename', view })}
                  >
                    <Icon name="pencil" size="sm" label={`Rename ${view.name}`} decorative />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-2"
                    aria-label={`Delete ${view.name}`}
                    onClick={() => setDialog({ kind: 'delete', view })}
                  >
                    <Icon name="close" size="sm" label={`Delete ${view.name}`} decorative />
                  </Button>
                </li>
              )
            })}
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
          description="The status, priority, and search on screen are stored under this name."
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
          takenNames={views
            .filter((view) => view.id !== dialog.view.id)
            .map((view) => view.name)}
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
