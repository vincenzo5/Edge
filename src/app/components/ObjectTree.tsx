"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import type { CellConfig, TrackedOverlay } from "@/lib/chartConfig";
import { mergeChartSettings, patchChartSettings } from "@/lib/chart/chartSettings";
import type { Candle, IndicatorConfig, Theme } from "@/lib/chart/contracts";
import { getCatalogEntry } from "@/lib/chart/indicators/registry";
import { resolveIndicatorLegend, resolvePriceLegend } from "@/lib/chart/legend";
import { formatObjectTreeLabel } from "@/lib/chart/annotationMetadata";
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

type ChartCommands = {
  selectDrawing: (id: string | null) => void;
  getSelectedDrawingId: () => string | null;
};

type Props = {
  chartId: string;
  config: CellConfig;
  overlays: TrackedOverlay[];
  dataWindow?: DataWindowProps;
  dataWindowActions?: ActiveChartDataWindowActions;
  chartCommands?: ChartCommands;
  onConfigChange: (next: CellConfig) => void;
  onOverlayAction: {
    remove: (id: string) => void;
    setVisible: (id: string, visible: boolean) => void;
    setLocked: (id: string, locked: boolean) => void;
    rename: (id: string, label: string) => void;
    bringForward: (id: string) => void;
    sendBackward: (id: string) => void;
    duplicate: (id: string) => void;
    subscribe: (cb: () => void) => () => void;
  };
  onAddIndicator: () => void;
  /** When true, renders without outer chrome (for right sidebar panel). */
  embedded?: boolean;
};

type PanelTab = "object-tree" | "data-window";

const TAB_STORAGE_PREFIX = "tv-ai:object-panel-tab:";

const ICON_SIZE = 14;

function loadActiveTab(chartId: string): PanelTab {
  if (typeof window === "undefined") return "object-tree";
  try {
    const raw = localStorage.getItem(`${TAB_STORAGE_PREFIX}${chartId}`);
    if (raw === "data-window" || raw === "object-tree") return raw;
  } catch { /* ignore */ }
  return "object-tree";
}

function saveActiveTab(chartId: string, tab: PanelTab) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${TAB_STORAGE_PREFIX}${chartId}`, tab);
  } catch { /* ignore */ }
}

function formatSymbolLine(
  symbol: string,
  interval: CellConfig["interval"],
  exchange?: string,
): string {
  const parts = [symbol];
  if (exchange) parts.push(exchange);
  parts.push(interval);
  return parts.join(" · ");
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
  chartId,
  config,
  overlays,
  dataWindow,
  dataWindowActions,
  chartCommands,
  onConfigChange,
  onOverlayAction,
  onAddIndicator,
  embedded = false,
}: Props) {
  const [activeTab, setActiveTab] = useState<PanelTab>(() => loadActiveTab(chartId));

  useEffect(() => {
    setActiveTab(loadActiveTab(chartId));
  }, [chartId]);

  const switchTab = useCallback(
    (tab: PanelTab) => {
      setActiveTab(tab);
      saveActiveTab(chartId, tab);
    },
    [chartId],
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);
  const [, bumpOverlayRevision] = useState(0);

  useEffect(() => {
    const unsub = onOverlayAction.subscribe(() => {
      bumpOverlayRevision((n) => n + 1);
    });
    return unsub;
  }, [onOverlayAction]);

  const removeIndicator = useCallback(
    (id: string) => {
      onConfigChange({
        ...config,
        indicators: config.indicators.filter((i) => i.id !== id),
      });
    },
    [config, onConfigChange],
  );

  const toggleIndicatorVisible = useCallback(
    (id: string) => {
      onConfigChange({
        ...config,
        indicators: config.indicators.map((i) =>
          i.id === id ? { ...i, visible: i.visible === false } : i,
        ),
      });
    },
    [config, onConfigChange],
  );

  const startRename = useCallback((id: string, currentLabel: string) => {
    setEditingId(id);
    setEditValue(currentLabel);
    requestAnimationFrame(() => editInputRef.current?.focus());
  }, []);

  const commitRename = useCallback(() => {
    if (editingId && editValue.trim()) {
      onOverlayAction.rename(editingId, editValue.trim());
    }
    setEditingId(null);
  }, [editingId, editValue, onOverlayAction]);

  const sortedOverlays = [...overlays].sort((a, b) => b.zLevel - a.zLevel);
  const selectedDrawingId = chartCommands?.getSelectedDrawingId() ?? null;

  const symbolLine = formatSymbolLine(
    config.symbol,
    config.interval,
    config.exchange,
  );

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
          <ObjectTreeTab
            symbolLine={symbolLine}
            config={config}
            sortedOverlays={sortedOverlays}
            selectedDrawingId={selectedDrawingId}
            editingId={editingId}
            editValue={editValue}
            editInputRef={editInputRef}
            onToggleIndicatorVisible={toggleIndicatorVisible}
            onRemoveIndicator={removeIndicator}
            onAddIndicator={onAddIndicator}
            onOverlayAction={onOverlayAction}
            onSelectDrawing={chartCommands?.selectDrawing}
            onStartRename={startRename}
            onEditValueChange={setEditValue}
            onCommitRename={commitRename}
            onCancelRename={() => setEditingId(null)}
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

function ObjectTreeTab({
  symbolLine,
  config,
  sortedOverlays,
  selectedDrawingId,
  editingId,
  editValue,
  editInputRef,
  onToggleIndicatorVisible,
  onRemoveIndicator,
  onAddIndicator,
  onOverlayAction,
  onSelectDrawing,
  onStartRename,
  onEditValueChange,
  onCommitRename,
  onCancelRename,
}: {
  symbolLine: string;
  config: CellConfig;
  sortedOverlays: TrackedOverlay[];
  selectedDrawingId: string | null;
  editingId: string | null;
  editValue: string;
  editInputRef: RefObject<HTMLInputElement | null>;
  onToggleIndicatorVisible: (id: string) => void;
  onRemoveIndicator: (id: string) => void;
  onAddIndicator: () => void;
  onOverlayAction: Props["onOverlayAction"];
  onSelectDrawing?: (id: string | null) => void;
  onStartRename: (id: string, label: string) => void;
  onEditValueChange: (v: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
}) {
  return (
    <div className="py-1">
      <div className="px-2 py-1 text-xs font-medium text-[var(--edge-text-primary)]">
        {symbolLine}
      </div>

      {config.indicators.map((ind) => {
        const isVisible = ind.visible !== false;
        return (
          <div
            key={ind.id}
            className={`group flex items-center gap-0.5 px-1 py-0.5 text-xs hover:bg-[var(--edge-surface-hover)] ${
              !isVisible ? "opacity-50" : ""
            }`}
          >
            <HoverIconButton
              title={isVisible ? "Hide indicator" : "Show indicator"}
              onClick={() => onToggleIndicatorVisible(ind.id)}
            >
              {isVisible ? (
                <EyeIcon size={ICON_SIZE} aria-hidden />
              ) : (
                <EyeOffIcon size={ICON_SIZE} aria-hidden />
              )}
            </HoverIconButton>
            <span className="min-w-0 flex-1 truncate text-[var(--edge-text-primary)]">
              {ind.name}
            </span>
            <div className="flex items-center opacity-0 group-hover:opacity-100">
              <HoverIconButton
                title={`Remove ${ind.name}`}
                onClick={() => onRemoveIndicator(ind.id)}
                className="hover:text-[var(--edge-negative)]"
              >
                <TrashIcon size={ICON_SIZE} aria-hidden />
              </HoverIconButton>
            </div>
          </div>
        );
      })}

      {sortedOverlays.map((o) => {
        const drawingMeta = config.drawings.find((d) => d.id === o.id)?.metadata;
        const displayLabel = formatObjectTreeLabel(o.label || o.name, drawingMeta);
        const isSelected = selectedDrawingId === o.id;
        return (
          <div
            key={o.id}
            className={`group flex items-center gap-0.5 px-1 py-0.5 text-xs hover:bg-[var(--edge-surface-hover)] ${
              !o.visible ? "opacity-50" : ""
            } ${isSelected ? "bg-[var(--edge-surface-active)] ring-1 ring-inset ring-[var(--edge-border-strong)]" : ""}`}
            draggable
            onClick={() => onSelectDrawing?.(o.id)}
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", o.id);
            }}
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              const draggedId = e.dataTransfer.getData("text/plain");
              if (draggedId && draggedId !== o.id) {
                onOverlayAction.bringForward(draggedId);
              }
            }}
          >
            <div className="flex items-center opacity-0 group-hover:opacity-100">
              <HoverIconButton
                title={o.visible ? "Hide drawing" : "Show drawing"}
                onClick={() => onOverlayAction.setVisible(o.id, !o.visible)}
              >
                {o.visible ? (
                  <EyeIcon size={ICON_SIZE} aria-hidden />
                ) : (
                  <EyeOffIcon size={ICON_SIZE} aria-hidden />
                )}
              </HoverIconButton>
              <HoverIconButton
                title={o.locked ? "Unlock drawing" : "Lock drawing"}
                onClick={() => onOverlayAction.setLocked(o.id, !o.locked)}
                className={o.locked ? "text-orange-500" : ""}
              >
                <LockIcon size={ICON_SIZE} aria-hidden />
              </HoverIconButton>
            </div>

            {editingId === o.id ? (
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
                  onStartRename(o.id, o.label);
                }}
                title="Double-click to rename"
              >
                {displayLabel}
              </span>
            )}

            <div className="flex items-center opacity-0 group-hover:opacity-100">
              <HoverIconButton
                title="Remove drawing"
                onClick={() => onOverlayAction.remove(o.id)}
                className="hover:text-[var(--edge-negative)]"
              >
                <TrashIcon size={ICON_SIZE} aria-hidden />
              </HoverIconButton>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={onAddIndicator}
        className="w-full px-2 py-1.5 text-left text-xs text-[var(--edge-accent-blue)] hover:bg-[var(--edge-surface-hover)]"
      >
        + Add indicator...
      </button>
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
