import type { RefObject } from "react";
import type { ObjectTreePaneNode } from "@/lib/chart/objectTreeModel";
import type { ObjectTreePaneActions } from "./types";
import { ObjectTreeDrawingRow } from "./ObjectTreeDrawingRow";
import { ObjectTreeIndicatorRow } from "./ObjectTreeIndicatorRow";

export function ObjectTreePaneBody({
  pane,
  showHeader,
  selectedDrawingId,
  editingKey,
  editValue,
  editInputRef,
  paneActions,
  onStartRename,
  onEditValueChange,
  onCommitRename,
  onCancelRename,
}: {
  pane: ObjectTreePaneNode;
  showHeader: boolean;
  selectedDrawingId: string | null;
  editingKey: string | null;
  editValue: string;
  editInputRef: RefObject<HTMLInputElement | null>;
  paneActions: ObjectTreePaneActions;
  onStartRename: (cellIndex: number, drawingId: string, label: string) => void;
  onEditValueChange: (value: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
}) {
  return (
    <div className="py-1">
      {showHeader ? (
        <div className="px-2 py-1 text-xs font-medium text-[var(--edge-text-primary)]">
          {pane.title}
        </div>
      ) : null}

      {pane.indicators.map((ind) => (
        <ObjectTreeIndicatorRow
          key={ind.id}
          indicator={ind}
          onToggleVisible={() => paneActions.onToggleIndicatorVisible(pane.cellIndex, ind.id)}
          onRemove={() => paneActions.onRemoveIndicator(pane.cellIndex, ind.id)}
        />
      ))}

      {pane.drawings.map((drawing) => (
        <ObjectTreeDrawingRow
          key={drawing.id}
          cellIndex={pane.cellIndex}
          drawing={drawing}
          isSelected={selectedDrawingId === drawing.id && pane.isActive}
          isEditing={editingKey === `${pane.cellIndex}:${drawing.id}`}
          editValue={editValue}
          editInputRef={editInputRef}
          onSelect={() => paneActions.onSelectDrawing(pane.cellIndex, drawing.id)}
          onToggleVisible={() =>
            paneActions.onDrawingSetVisible(pane.cellIndex, drawing.id, !drawing.visible)
          }
          onToggleLocked={() =>
            paneActions.onDrawingSetLocked(pane.cellIndex, drawing.id, !drawing.locked)
          }
          onRemove={() => paneActions.onDrawingRemove(pane.cellIndex, drawing.id)}
          onBringForward={(draggedId) =>
            paneActions.onDrawingBringForward(pane.cellIndex, draggedId)
          }
          onStartRename={() => onStartRename(pane.cellIndex, drawing.id, drawing.label)}
          onEditValueChange={onEditValueChange}
          onCommitRename={onCommitRename}
          onCancelRename={onCancelRename}
        />
      ))}

      <button
        type="button"
        onClick={() => paneActions.onAddIndicator(pane.cellIndex)}
        className="w-full px-2 py-1.5 text-left text-xs text-[var(--edge-accent-blue)] hover:bg-[var(--edge-surface-hover)]"
      >
        + Add indicator...
      </button>
    </div>
  );
}
