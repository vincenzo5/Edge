"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import type { IndicatorConfig } from "@/lib/chart/contracts";
import { getCatalogEntry } from "@/lib/chart/indicators/registry";
import { resolveIndicatorLegend, resolvePriceLegend } from "@/lib/chart/legend";
import { formatObjectTreeLabel } from "@/lib/chart/annotationMetadata";
import type {
  ObjectTreeDrawingRow,
  ObjectTreeLayoutModel,
  ObjectTreePaneNode,
} from "@/lib/chart/objectTreeModel";
import { formatObjectTreeSymbolLine } from "@/lib/chart/objectTreeModel";
import { mergeChartSettings, patchChartSettings } from "@/lib/chart/chartSettings";
import type { Candle, Theme } from "@/lib/chart/contracts";
import type { CellConfig } from "@/lib/chartConfig";
import { IndicatorRegistry } from "@/lib/chart/pluginHost";
import { formatCrosshairTime } from "@/lib/chart/timeAxis";
import type { ActiveChartDataWindowActions } from "./ActiveChartContext";
import {
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  TrashIcon,
} from "./chart-icons/ChartToolIcons";
import EdgeSegmentedTabs from "./design-system/EdgeSegmentedTabs";

export type DataWindowProps = {
  dataIndex: number | null;
  candles: Candle[];
  indicators: IndicatorConfig[];
  symbol: string;
  symbolName?: string;
  exchange?: string;
  interval: CellConfig["interval"];
  theme: Theme;
  chartSettings?: CellConfig["chartSettings"];
  mainSeriesVisible?: boolean;
  dataMeta?: {
    source: string;
    asOf?: number;
    stale?: boolean;
    warnings?: string[];
    streaming?: boolean;
    streamError?: string | null;
    lastUpdateAt?: number;
  } | null;
};

export type ObjectTreePaneActions = {
  onPaneFocus: (cellIndex: number) => void;
  onToggleIndicatorVisible: (cellIndex: number, indicatorId: string) => void;
  onRemoveIndicator: (cellIndex: number, indicatorId: string) => void;
  onAddIndicator: (cellIndex: number) => void;
  onDrawingSetVisible: (cellIndex: number, drawingId: string, visible: boolean) => void;
  onDrawingSetLocked: (cellIndex: number, drawingId: string, locked: boolean) => void;
  onDrawingRemove: (cellIndex: number, drawingId: string) => void;
  onDrawingRename: (cellIndex: number, drawingId: string, label: string) => void;
  onDrawingBringForward: (cellIndex: number, drawingId: string) => void;
  onSelectDrawing: (cellIndex: number, drawingId: string) => void;
  subscribeOverlayChanges?: (cb: () => void) => () => void;
};

type Props = {
  panelKey: string;
  layoutModel: ObjectTreeLayoutModel;
  paneActions: ObjectTreePaneActions;
  selectedDrawingId: string | null;
  dataWindow?: DataWindowProps;
  dataWindowActions?: ActiveChartDataWindowActions;
  embedded?: boolean;
};

type PanelTab = "object-tree" | "data-window";

const TAB_STORAGE_PREFIX = "tv-ai:object-panel-tab:";

const ICON_SIZE = 14;

function loadActiveTab(panelKey: string): PanelTab {
  if (typeof window === "undefined") return "object-tree";
  try {
    const raw = localStorage.getItem(`${TAB_STORAGE_PREFIX}${panelKey}`);
    if (raw === "data-window" || raw === "object-tree") return raw;
  } catch { /* ignore */ }
  return "object-tree";
}

function saveActiveTab(panelKey: string, tab: PanelTab) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${TAB_STORAGE_PREFIX}${panelKey}`, tab);
  } catch { /* ignore */ }
}

function formatSymbolLine(
  symbol: string,
  interval: CellConfig["interval"],
  exchange?: string,
): string {
  return formatObjectTreeSymbolLine(symbol, interval, exchange);
}

function HoverIconButton({
  title,
  onClick,
  className = "",
  children,
}: {
  title: string;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-[var(--edge-radius-xs)] text-[var(--edge-text-muted)] hover:bg-[var(--edge-surface-hover)] hover:text-[var(--edge-text-primary)] ${className}`}
    >
      {children}
    </button>
  );
}

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

function ObjectTreeContent({
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

function ObjectTreePaneSection({
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

function ObjectTreePaneBody({
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
        <ObjectTreeDrawingRowView
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

function ObjectTreeIndicatorRow({
  indicator,
  onToggleVisible,
  onRemove,
}: {
  indicator: IndicatorConfig;
  onToggleVisible: () => void;
  onRemove: () => void;
}) {
  const isVisible = indicator.visible !== false;
  return (
    <div
      className={`group flex items-center gap-0.5 px-1 py-0.5 text-xs hover:bg-[var(--edge-surface-hover)] ${
        !isVisible ? "opacity-50" : ""
      }`}
    >
      <HoverIconButton
        title={isVisible ? "Hide indicator" : "Show indicator"}
        onClick={onToggleVisible}
      >
        {isVisible ? (
          <EyeIcon size={ICON_SIZE} aria-hidden />
        ) : (
          <EyeOffIcon size={ICON_SIZE} aria-hidden />
        )}
      </HoverIconButton>
      <span className="min-w-0 flex-1 truncate text-[var(--edge-text-primary)]">
        {indicator.name}
      </span>
      <div className="flex items-center opacity-0 group-hover:opacity-100">
        <HoverIconButton
          title={`Remove ${indicator.name}`}
          onClick={onRemove}
          className="hover:text-[var(--edge-negative)]"
        >
          <TrashIcon size={ICON_SIZE} aria-hidden />
        </HoverIconButton>
      </div>
    </div>
  );
}

function ObjectTreeDrawingRowView({
  cellIndex,
  drawing,
  isSelected,
  isEditing,
  editValue,
  editInputRef,
  onSelect,
  onToggleVisible,
  onToggleLocked,
  onRemove,
  onBringForward,
  onStartRename,
  onEditValueChange,
  onCommitRename,
  onCancelRename,
}: {
  cellIndex: number;
  drawing: ObjectTreeDrawingRow;
  isSelected: boolean;
  isEditing: boolean;
  editValue: string;
  editInputRef: RefObject<HTMLInputElement | null>;
  onSelect: () => void;
  onToggleVisible: () => void;
  onToggleLocked: () => void;
  onRemove: () => void;
  onBringForward: (draggedId: string) => void;
  onStartRename: () => void;
  onEditValueChange: (value: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
}) {
  void cellIndex;
  const displayLabel = formatObjectTreeLabel(drawing.label || drawing.name, drawing.metadata);
  return (
    <div
      className={`group flex items-center gap-0.5 px-1 py-0.5 text-xs hover:bg-[var(--edge-surface-hover)] ${
        !drawing.visible ? "opacity-50" : ""
      } ${isSelected ? "bg-[var(--edge-surface-active)] ring-1 ring-inset ring-[var(--edge-border-strong)]" : ""}`}
      draggable
      onClick={onSelect}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", drawing.id);
      }}
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData("text/plain");
        if (draggedId && draggedId !== drawing.id) {
          onBringForward(draggedId);
        }
      }}
    >
      <div className="flex items-center opacity-0 group-hover:opacity-100">
        <HoverIconButton
          title={drawing.visible ? "Hide drawing" : "Show drawing"}
          onClick={onToggleVisible}
        >
          {drawing.visible ? (
            <EyeIcon size={ICON_SIZE} aria-hidden />
          ) : (
            <EyeOffIcon size={ICON_SIZE} aria-hidden />
          )}
        </HoverIconButton>
        <HoverIconButton
          title={drawing.locked ? "Unlock drawing" : "Lock drawing"}
          onClick={onToggleLocked}
          className={drawing.locked ? "text-orange-500" : ""}
        >
          <LockIcon size={ICON_SIZE} aria-hidden />
        </HoverIconButton>
      </div>

      {isEditing ? (
        <input
          ref={editInputRef}
          value={editValue}
          onChange={(e) => onEditValueChange(e.target.value)}
          onBlur={onCommitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCommitRename();
            if (e.key === "Escape") onCancelRename();
          }}
          className="min-w-0 flex-1 rounded border border-[var(--edge-border-strong)] bg-[var(--edge-surface-panel)] px-1 py-0 text-xs text-[var(--edge-text-primary)]"
        />
      ) : (
        <span
          className="min-w-0 flex-1 truncate text-xs text-[var(--edge-text-primary)]"
          onDoubleClick={(e) => {
            e.stopPropagation();
            onStartRename();
          }}
          title="Double-click to rename"
        >
          {displayLabel}
        </span>
      )}

      <div className="flex items-center opacity-0 group-hover:opacity-100">
        <HoverIconButton
          title="Remove drawing"
          onClick={onRemove}
          className="hover:text-[var(--edge-negative)]"
        >
          <TrashIcon size={ICON_SIZE} aria-hidden />
        </HoverIconButton>
      </div>
    </div>
  );
}

function DataWindowTab({
  dataWindow,
  dataWindowActions,
}: {
  dataWindow?: DataWindowProps;
  dataWindowActions?: ActiveChartDataWindowActions;
}) {
  if (!dataWindow || dataWindow.candles.length === 0) {
    return (
      <div className="px-2 py-2 text-xs italic text-[var(--edge-text-muted)]">
        Hover over the chart to see values.
      </div>
    );
  }

  const settings = mergeChartSettings(dataWindow.chartSettings);
  const dataWindowChartSettings = patchChartSettings(dataWindow.chartSettings, {
    statusLine: {
      indicatorShowValues: true,
    },
  });
  const mainVisible = dataWindow.mainSeriesVisible !== false;
  const index =
    dataWindow.dataIndex != null &&
    dataWindow.dataIndex >= 0 &&
    dataWindow.dataIndex < dataWindow.candles.length
      ? dataWindow.dataIndex
      : dataWindow.candles.length - 1;
  const candle = dataWindow.candles[index];
  const dateLabel = candle
    ? formatCrosshairTime(candle.t, dataWindow.interval)
    : "";

  const priceSections = mainVisible
    ? resolvePriceLegend({
        symbol: dataWindow.symbol,
        symbolName: dataWindow.symbolName,
        exchange: dataWindow.exchange,
        interval: dataWindow.interval,
        candles: dataWindow.candles,
        dataIndex: dataWindow.dataIndex,
        chartSettings: dataWindow.chartSettings,
      })
    : null;

  const ohlcRows =
    priceSections
      ?.filter((s) => s.kind === "value" && s.id !== "volume" && s.id !== "change")
      .map((s) =>
        s.kind === "value"
          ? { id: s.id, label: s.label, value: s.value, color: s.color }
          : null,
      )
      .filter(Boolean) as Array<{
      id: string;
      label: string;
      value: string;
      color?: string;
    }> | undefined;

  const changeRow = priceSections?.find((s) => s.kind === "value" && s.id === "change");

  const volIndicator = dataWindow.indicators.find((i) => i.name === "VOL");
  const volumeVisible = volIndicator?.visible !== false;

  let volumeRows: Array<{ id: string; label: string; value: string; color?: string }> = [];
  if (volIndicator && IndicatorRegistry.get("VOL")) {
    const volSections = resolveIndicatorLegend(
      volIndicator,
      dataWindow.candles,
      dataWindow.dataIndex,
      dataWindow.theme,
      dataWindowChartSettings,
    );
    const volValues = volSections?.filter((s) => s.kind === "value") ?? [];
    volumeRows = volValues.map((s, i) =>
      s.kind === "value"
        ? { id: `vol-${i}`, label: s.label, value: s.value, color: s.color }
        : { id: `vol-${i}`, label: "", value: "" },
    );
  }

  const indicatorBlocks = dataWindow.indicators
    .filter((ind) => ind.visible !== false)
    .map((ind) => {
      if (!IndicatorRegistry.get(ind.name)) return null;
      const sections = resolveIndicatorLegend(
        ind,
        dataWindow.candles,
        dataWindow.dataIndex,
        dataWindow.theme,
        dataWindowChartSettings,
      );
      if (!sections) return null;
      const values = sections.filter((s) => s.kind === "value");
      if (values.length === 0) return null;
      const titleSection = sections.find((s) => s.kind === "text");
      const title =
        titleSection?.kind === "text" ? titleSection.text : ind.name;
      return { id: ind.id, name: ind.name, title, values, visible: true };
    })
    .filter(Boolean) as Array<{
    id: string;
    name: string;
    title: string;
    values: Array<{ label: string; value: string; color?: string }>;
    visible: boolean;
  }>;

  const displayName = dataWindow.symbolName ?? dataWindow.symbol;
  const priceHeader = formatSymbolLine(
    displayName,
    dataWindow.interval,
    dataWindow.exchange,
  );

  return (
    <div className="space-y-1 px-2 py-1.5 text-[11px]">
      {dateLabel && (
        <div className="pb-1 text-xs text-[var(--edge-text-primary)]">
          {dateLabel}
        </div>
      )}
      {dataWindow.dataMeta?.source && (
        <div className="pb-1 text-[10px] font-medium uppercase tracking-wide text-[var(--edge-text-muted)]">
          Source: {dataWindow.dataMeta.source}
          {dataWindow.dataMeta.streaming ? ' · live' : ''}
          {dataWindow.dataMeta.stale ? ' · stale' : ''}
          {dataWindow.dataMeta.warnings && dataWindow.dataMeta.warnings.length > 0
            ? ` · ${dataWindow.dataMeta.warnings[0]}`
            : ''}
        </div>
      )}

      <DataWindowSectionHeader
        title={priceHeader}
        visible={mainVisible}
        visibilityLabel="price series"
        onToggleVisible={(visible) => dataWindowActions?.setPriceVisible(visible)}
      />
      <CollapsibleSection visible={mainVisible}>
        {(ohlcRows?.length ?? 0) > 0 && <ValueGrid rows={ohlcRows!} />}
        {changeRow?.kind === "value" && settings.statusLine.showBarChangeValues && (
          <ValueGrid
            rows={[
              {
                id: "change",
                label: changeRow.label || "Chg",
                value: changeRow.value,
                color: changeRow.color,
              },
            ]}
          />
        )}
      </CollapsibleSection>

      {volIndicator && (
        <>
          <DataWindowSectionHeader
            title="Volume"
            visible={volumeVisible}
            visibilityLabel="volume"
            onToggleVisible={(visible) => dataWindowActions?.setVolumeVisible(visible)}
          />
          <CollapsibleSection visible={volumeVisible}>
            {volumeRows.length > 0 && <ValueGrid rows={volumeRows} />}
          </CollapsibleSection>
        </>
      )}

      {dataWindow.indicators
        .filter((ind) => ind.name !== "VOL")
        .map((ind) => {
          const block = indicatorBlocks.find((b) => b.id === ind.id);
          const isVisible = ind.visible !== false;
          const fallbackTitle = getCatalogEntry(ind.name)?.description ?? ind.name;
          return (
            <div key={ind.id}>
              <DataWindowSectionHeader
                title={block?.title ?? fallbackTitle}
                visible={isVisible}
                visibilityLabel={ind.name}
                onToggleVisible={(visible) =>
                  dataWindowActions?.setIndicatorVisible(ind.id, visible)
                }
              />
              <CollapsibleSection visible={isVisible}>
                {block && (
                  <ValueGrid
                    rows={block.values.map((v, i) => ({
                      id: `${ind.id}-${i}`,
                      label: v.label,
                      value: v.value,
                      color: v.color,
                    }))}
                  />
                )}
              </CollapsibleSection>
            </div>
          );
        })}
    </div>
  );
}

function CollapsibleSection({
  visible,
  children,
}: {
  visible: boolean;
  children: ReactNode;
}) {
  if (!visible) {
    return (
      <div
        aria-hidden
        className="h-0 overflow-hidden"
      >
        {children}
      </div>
    );
  }

  return <>{children}</>;
}

function DataWindowSectionHeader({
  title,
  visible,
  onToggleVisible,
  visibilityLabel,
}: {
  title: string;
  visible: boolean;
  onToggleVisible?: (visible: boolean) => void;
  visibilityLabel?: string;
}) {
  const toggleTitle = visible
    ? `Hide ${visibilityLabel ?? title}`
    : `Show ${visibilityLabel ?? title}`;
  return (
    <div className="group flex items-center gap-1 py-0.5">
      <span className="min-w-0 flex-1 truncate font-medium text-[var(--edge-text-secondary)]">
        {title}
      </span>
      {onToggleVisible && (
        <div className="opacity-0 group-hover:opacity-100">
          <HoverIconButton
            title={toggleTitle}
            onClick={() => onToggleVisible(!visible)}
          >
            {visible ? (
              <EyeIcon size={ICON_SIZE} aria-hidden />
            ) : (
              <EyeOffIcon size={ICON_SIZE} aria-hidden />
            )}
          </HoverIconButton>
        </div>
      )}
    </div>
  );
}

function ValueGrid({
  rows,
}: {
  rows: Array<{ id: string; label: string; value: string; color?: string }>;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 pb-1 font-mono tabular-nums">
      {rows.map((row) => (
        <div key={row.id} className="flex justify-between gap-1">
          <span className="text-[var(--edge-text-muted)]">{row.label || row.id}</span>
          <span
            style={row.color ? { color: row.color } : undefined}
            className="text-[var(--edge-text-strong)]"
          >
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}
