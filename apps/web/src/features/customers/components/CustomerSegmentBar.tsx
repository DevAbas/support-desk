import { useState } from 'react'
import { Badge, Button, Modal } from '@/design-system'
import { cn } from '@/lib/cn'
import type { CustomerSegment } from '../customerSegments'
import { CustomerSegmentNameDialog } from './CustomerSegmentNameDialog'

type Dialog =
  | { kind: 'save' }
  | { kind: 'rename'; segment: CustomerSegment }
  | { kind: 'delete'; segment: CustomerSegment }

interface CustomerSegmentBarProps {
  segments: readonly CustomerSegment[]
  /** `null` means no segment is selected: the list is showing everyone. */
  activeSegmentId: string | null
  /** True when the filters on screen have drifted from what is selected. */
  isModified: boolean
  onSelectSegment: (segment: CustomerSegment | null) => void
  onSaveSegment: (name: string) => void
  onRenameSegment: (id: string, name: string) => void
  onDeleteSegment: (id: string) => void
}

const chipClasses = 'min-w-0 max-w-56 font-normal'

const activeChipClasses =
  'bg-primary-subtle text-primary-subtle-fg hover:bg-primary-subtle hover:text-primary-subtle-fg'

/**
 * The saved segments, as a strip across the top of the list.
 *
 * The ticket screen keeps its saved views in a sidebar, and this is deliberately
 * not that. A dense list is scanned down for a person, so it wants its width;
 * the filters below are one line for the same reason, and a column of names
 * beside sixty rows would take from the rows to say something a row of chips
 * says in the space already there.
 *
 * Rename and delete belong to the selected segment and sit next to it rather
 * than on every chip. Twelve controls in a strip is a strip nobody reads, and
 * renaming a segment is something you do to the one you are looking at.
 */
export function CustomerSegmentBar({
  segments,
  activeSegmentId,
  isModified,
  onSelectSegment,
  onSaveSegment,
  onRenameSegment,
  onDeleteSegment,
}: CustomerSegmentBarProps) {
  const [dialog, setDialog] = useState<Dialog | null>(null)

  function closeDialog() {
    setDialog(null)
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
      {/* Labelled, and `role="list"` explicitly, for the same reason `List`
          does both: laying the items out with flex takes the bullets off, and
          the list semantics go with them in some browsers. */}
      <ul role="list" aria-label="Segments" className="flex min-w-0 flex-wrap items-center gap-1">
        <li>
          <Button
            variant="ghost"
            size="sm"
            aria-current={activeSegmentId === null ? 'true' : undefined}
            className={cn(chipClasses, activeSegmentId === null && activeChipClasses)}
            onClick={() => onSelectSegment(null)}
          >
            <span className="truncate">All customers</span>
            {activeSegmentId === null && isModified ? (
              <Badge status="warning">Modified</Badge>
            ) : null}
          </Button>
        </li>

        {segments.map((segment) => {
          const isActive = segment.id === activeSegmentId

          return (
            <li key={segment.id} className="flex min-w-0 items-center">
              <Button
                variant="ghost"
                size="sm"
                aria-current={isActive ? 'true' : undefined}
                className={cn(chipClasses, isActive && activeChipClasses)}
                onClick={() => onSelectSegment(segment)}
              >
                <span className="truncate">{segment.name}</span>
                {isActive && isModified ? <Badge status="warning">Modified</Badge> : null}
              </Button>

              {isActive ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-2"
                    aria-label={`Rename ${segment.name}`}
                    onClick={() => setDialog({ kind: 'rename', segment })}
                  >
                    &#9998;
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="px-2"
                    aria-label={`Delete ${segment.name}`}
                    onClick={() => setDialog({ kind: 'delete', segment })}
                  >
                    &#215;
                  </Button>
                </>
              ) : null}
            </li>
          )
        })}
      </ul>

      {/* Where the chips would be, so the strip says what it is for before
          there is anything in it to say it. */}
      {segments.length === 0 ? (
        <p className="text-sm text-fg-muted">Filter the list, then save it as a segment.</p>
      ) : null}

      <Button
        variant="secondary"
        size="sm"
        className="ml-auto"
        onClick={() => setDialog({ kind: 'save' })}
      >
        Save these filters
      </Button>

      {dialog?.kind === 'save' ? (
        <CustomerSegmentNameDialog
          title="Save this segment"
          description="The plans and search on screen are stored under this name."
          confirmLabel="Save segment"
          takenNames={segments.map((segment) => segment.name)}
          onConfirm={(name) => {
            onSaveSegment(name)
            closeDialog()
          }}
          onClose={closeDialog}
        />
      ) : null}

      {dialog?.kind === 'rename' ? (
        <CustomerSegmentNameDialog
          title="Rename segment"
          confirmLabel="Save name"
          initialName={dialog.segment.name}
          // Its own name is not taken, so keeping it is not a clash.
          takenNames={segments
            .filter((segment) => segment.id !== dialog.segment.id)
            .map((segment) => segment.name)}
          onConfirm={(name) => {
            onRenameSegment(dialog.segment.id, name)
            closeDialog()
          }}
          onClose={closeDialog}
        />
      ) : null}

      {dialog?.kind === 'delete' ? (
        <Modal
          open
          onClose={closeDialog}
          title="Delete saved segment"
          description={`This removes “${dialog.segment.name}”. The filters on screen stay as they are.`}
          footer={
            <>
              <Button variant="secondary" onClick={closeDialog}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  onDeleteSegment(dialog.segment.id)
                  closeDialog()
                }}
              >
                Delete segment
              </Button>
            </>
          }
        />
      ) : null}
    </div>
  )
}
