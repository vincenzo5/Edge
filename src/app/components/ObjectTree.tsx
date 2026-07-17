"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ActiveChartDataWindowActions } from "./ActiveChartContext";
import EdgeSegmentedTabs from "./design-system/EdgeSegmentedTabs";
import { DataWindowTab } from "./object-tree/DataWindowTab";
import { ObjectTreeContent } from "./object-tree/ObjectTreeContent";
import {
  loadActiveTab,
  saveActiveTab,
  type DataWindowProps,
  type ObjectTreePaneActions,
  type PanelTab,
} from "./object-tree/types";
import type { ObjectTreeLayoutModel } from "@/lib/chart/objectTreeModel";

export type { DataWindowProps, ObjectTreePaneActions };

type Props = {
  panelKey: string;
  layoutModel: ObjectTreeLayoutModel;
  paneActions: ObjectTreePaneActions;
  selectedDrawingId: string | null;
  dataWindow?: DataWindowProps;
  dataWindowActions?: ActiveChartDataWindowActions;
  embedded?: boolean;
};

export default function ObjectTree({
  panelKey,
  layoutModel,
  paneActions,
  selectedDrawingId,
  dataWindow,
  dataWindowActions,
  embedded = false,
}: Props) {
  const [activeTab, setActiveTab] = useState<PanelTab>(() => loadActiveTab(panelKey));

  useEffect(() => {
    setActiveTab(loadActiveTab(panelKey));
  }, [panelKey]);

  const switchTab = useCallback(
    (tab: PanelTab) => {
      setActiveTab(tab);
      saveActiveTab(panelKey, tab);
    },
    [panelKey],
  );

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);
  const [, bumpOverlayRevision] = useState(0);
  const [collapsedPanes, setCollapsedPanes] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    const unsub = paneActions.subscribeOverlayChanges?.(() => {
      bumpOverlayRevision((n) => n + 1);
    });
    return unsub;
  }, [paneActions]);

  useEffect(() => {
    setCollapsedPanes((prev) => {
      const next = new Set(prev);
      for (const pane of layoutModel.panes) {
        if (pane.isActive) next.delete(pane.cellIndex);
      }
      return next;
    });
  }, [layoutModel]);

  const startRename = useCallback((cellIndex: number, drawingId: string, currentLabel: string) => {
    setEditingKey(`${cellIndex}:${drawingId}`);
    setEditValue(currentLabel);
    requestAnimationFrame(() => editInputRef.current?.focus());
  }, []);

  const commitRename = useCallback(() => {
    if (!editingKey || !editValue.trim()) {
      setEditingKey(null);
      return;
    }
    const [cellIndexRaw, drawingId] = editingKey.split(":");
    const cellIndex = Number(cellIndexRaw);
    if (Number.isFinite(cellIndex) && drawingId) {
      paneActions.onDrawingRename(cellIndex, drawingId, editValue.trim());
    }
    setEditingKey(null);
  }, [editingKey, editValue, paneActions]);

  const togglePaneCollapsed = useCallback((cellIndex: number) => {
    setCollapsedPanes((prev) => {
      const next = new Set(prev);
      if (next.has(cellIndex)) next.delete(cellIndex);
      else next.add(cellIndex);
      return next;
    });
  }, []);

  return (
    <div
      className={
        embedded
          ? "flex min-h-0 flex-col"
          : "flex w-[220px] shrink-0 flex-col overflow-hidden border-l border-[var(--edge-border)] bg-[var(--edge-surface-panel)]"
      }
    >
      {!embedded && (
        <div className="flex items-center justify-between border-b border-[var(--edge-border)] px-2 py-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--edge-text-secondary)]">
            Objects
          </span>
        </div>
      )}

      <div className="shrink-0 border-b border-[var(--edge-border)] px-2 py-1.5">
        <EdgeSegmentedTabs
          segments={[
            { id: "object-tree", label: "Object tree" },
            { id: "data-window", label: "Data window" },
          ]}
          value={activeTab}
          onChange={(id) => switchTab(id as PanelTab)}
        />
      </div>

      <div className={embedded ? "min-h-0 flex-1 overflow-auto" : "flex-1 overflow-auto"}>
        {activeTab === "object-tree" ? (
          <ObjectTreeContent
            layoutModel={layoutModel}
            collapsedPanes={collapsedPanes}
            selectedDrawingId={selectedDrawingId}
            editingKey={editingKey}
            editValue={editValue}
            editInputRef={editInputRef}
            paneActions={paneActions}
            onTogglePaneCollapsed={togglePaneCollapsed}
            onStartRename={startRename}
            onEditValueChange={setEditValue}
            onCommitRename={commitRename}
            onCancelRename={() => setEditingKey(null)}
          />
        ) : (
          <DataWindowTab
            dataWindow={dataWindow}
            dataWindowActions={dataWindowActions}
          />
        )}
      </div>
    </div>
  );
}
