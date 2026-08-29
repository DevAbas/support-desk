import { useState } from 'react'
import { Badge, Button, Card, CardBody, CardFooter, CardHeader, Modal } from '@harness-sample/ui'
import { cn } from '@harness-sample/shared'
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

const activeRowClasses =
  'bg-primary-subtle text-primary-subtle-fg hover:bg-primary-subtle hover:text-primary-subtle-fg'

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
                variant="ghost"
                size="sm"
                aria-current={activeViewId === null ? 'true' : undefined}
                className={cn(rowClasses, activeViewId === null && activeRowClasses)}
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
                    variant="ghost"
                    size="sm"
                    aria-current={isActive ? 'true' : undefined}
                    className={cn(rowClasses, isActive && activeRowClasses)}
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
                    &#9998;
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-2"
                    aria-label={`Delete ${view.name}`}
                    onClick={() => setDialog({ kind: 'delete', view })}
                  >
                    &#215;
                  </Button>
                </li>
              )
            })}
          </ul>

          {views.length === 0 ? (
            <p className="px-3 py-2 text-sm text-fg-muted">
              No saved views yet. Set the filters you want, then save them.
            </p>
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
        <Modal
          open
          onClose={closeDialog}
          title="Delete saved view"
          description={`This removes “${dialog.view.name}”. The filters on screen stay as they are.`}
          footer={
            <>
              <Button variant="secondary" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  onDeleteView(dialog.view.id)
                  closeDialog()
                }}
              >
                Delete view
              </Button>
            </>
          }
        />
      ) : null}
    </aside>
  )
}
