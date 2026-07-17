import type { RefObject } from "react";
import type { ObjectTreePaneNode } from "@/lib/chart/objectTreeModel";
import type { ObjectTreePaneActions } from "./types";
import { ObjectTreePaneBody } from "./ObjectTreePaneBody";

export function ObjectTreePaneSection({
  pane,
  collapsed,
  selectedDrawingId,
  editingKey,
  editValue,
  editInputRef,
  paneActions,
  onToggleCollapsed,
  onStartRename,
  onEditValueChange,
  onCommitRename,
  onCancelRename,
}: {
  pane: ObjectTreePaneNode;
  collapsed: boolean;
  selectedDrawingId: string | null;
  editingKey: string | null;
  editValue: string;
  editInputRef: RefObject<HTMLInputElement | null>;
  paneActions: ObjectTreePaneActions;
  onToggleCollapsed: () => void;
  onStartRename: (cellIndex: number, drawingId: string, label: string) => void;
  onEditValueChange: (value: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
}) {
  return (
    <div
      className={`mb-1 border-b border-[var(--edge-border)] last:border-b-0 ${
        pane.isActive ? "bg-[color-mix(in_srgb,var(--edge-accent-blue)_8%,transparent)]" : ""
      }`}
    >
      <div className="flex w-full items-center gap-1 px-2 py-1.5">
        <button
          type="button"
          onClick={() => paneActions.onPaneFocus(pane.cellIndex)}
          className={`min-w-0 flex-1 truncate text-left text-xs font-medium ${
            pane.isActive
              ? "text-[var(--edge-accent-blue)]"
              : "text-[var(--edge-text-primary)] hover:text-[var(--edge-text-strong)]"
          }`}
        >
          {pane.title}
        </button>
        <button
          type="button"
          aria-label={`${collapsed ? "Expand" : "Collapse"} ${pane.title}`}
          onClick={onToggleCollapsed}
          className="shrink-0 px-1 text-[10px] text-[var(--edge-text-muted)] hover:text-[var(--edge-text-primary)]"
        >
          {collapsed ? "▸" : "▾"}
        </button>
      </div>
      {!collapsed ? (
        <ObjectTreePaneBody
          pane={pane}
          showHeader={false}
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
      ) : null}
    </div>
  );
}
