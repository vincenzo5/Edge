import type { RefObject } from "react";
import type { ObjectTreeLayoutModel } from "@/lib/chart/objectTreeModel";
import type { ObjectTreePaneActions } from "./types";
import { ObjectTreePaneBody } from "./ObjectTreePaneBody";
import { ObjectTreePaneSection } from "./ObjectTreePaneSection";

export function ObjectTreeContent({
  layoutModel,
  collapsedPanes,
  selectedDrawingId,
  editingKey,
  editValue,
  editInputRef,
  paneActions,
  onTogglePaneCollapsed,
  onStartRename,
  onEditValueChange,
  onCommitRename,
  onCancelRename,
}: {
  layoutModel: ObjectTreeLayoutModel;
  collapsedPanes: Set<number>;
  selectedDrawingId: string | null;
  editingKey: string | null;
  editValue: string;
  editInputRef: RefObject<HTMLInputElement | null>;
  paneActions: ObjectTreePaneActions;
  onTogglePaneCollapsed: (cellIndex: number) => void;
  onStartRename: (cellIndex: number, drawingId: string, label: string) => void;
  onEditValueChange: (value: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
}) {
  if (layoutModel.mode === "single") {
    const pane = layoutModel.panes[0];
    return (
      <ObjectTreePaneBody
        pane={pane}
        showHeader
        selectedDrawingId={selectedDrawingId}
        editingKey={editingKey}
        editValue={editValue}
        editInputRef={editInputRef}
        paneActions={paneActions}
        onStartRename={onStartRename}
        onEditValueChange={onEditValueChange}
        onCommitRename={onCommitRename}
        onCancelRename={onCancelRename}
      />
    );
  }

  return (
    <div className="py-1">
      {layoutModel.panes.map((pane) => (
        <ObjectTreePaneSection
          key={pane.chartId}
          pane={pane}
          collapsed={collapsedPanes.has(pane.cellIndex)}
          selectedDrawingId={selectedDrawingId}
          editingKey={editingKey}
          editValue={editValue}
          editInputRef={editInputRef}
          paneActions={paneActions}
          onToggleCollapsed={() => onTogglePaneCollapsed(pane.cellIndex)}
          onStartRename={onStartRename}
          onEditValueChange={onEditValueChange}
          onCommitRename={onCommitRename}
          onCancelRename={onCancelRename}
        />
      ))}
    </div>
  );
}
