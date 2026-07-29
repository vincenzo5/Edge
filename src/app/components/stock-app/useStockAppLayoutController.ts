"use client";

import { useCallback, useEffect, useMemo } from "react";
import {
  DEFAULT_CELL,
  DEFAULT_TOOLBAR_PREFS,
  applyLinkPropagation,
  applyLayoutTemplateChange,
  cellCountFor,
  createScriptIndicatorInstance,
  type CellConfig,
  type ChartLayout,
  type ChartType,
  type LayoutSyncPrefs,
  type LayoutTemplateId,
  type SidebarPanelId,
  type Theme,
  type ToolbarPrefs,
} from "@/lib/chartConfig";
import type { Interval } from "@edge/chart-core/contracts";
import { rangeForManualInterval } from "@edge/chart-react/engine/rangeInterval";
import { useChartDeepLinkBootstrap } from "@/app/components/journal/useChartDeepLinkBootstrap";
import type { ChartDeepLinkParams } from "@/lib/journal/chartDeepLink";
import { recordRecentSymbol, seedRecentSymbols } from "@/lib/app/recentSymbols";
import { renameTab, type WorkspaceTabsState } from "@/lib/app/workspaceTabs";
import {
  cellChartId,
  getCellConfig,
  isDrawingViewportOnlyPatch,
  scheduleCellLayoutFlush,
  setCellConfig,
} from "@/lib/chart/cellLayoutStore";
import { buildAppActions } from "../AppActionsContext";
import { useAppThemeOptional } from "../AppThemeProvider";
import { useSymbolNavigationHistory } from "../chart-chrome/useSymbolNavigationHistory";
import type { MutableRefObject } from "react";

type Args = {
  layout: ChartLayout;
  setLayout: (updater: ChartLayout | ((prev: ChartLayout) => ChartLayout)) => void;
  workspaceTabs: WorkspaceTabsState;
  setWorkspaceTabs: React.Dispatch<React.SetStateAction<WorkspaceTabsState>>;
  activeTab: { title: string };
  hydrated: boolean;
  hydratedRef: MutableRefObject<boolean>;
  handleSidebarPanelChange: (activePanel: SidebarPanelId | null) => void;
};

export function useStockAppLayoutController({
  layout,
  setLayout,
  workspaceTabs,
  setWorkspaceTabs,
  activeTab,
  hydrated,
  hydratedRef,
  handleSidebarPanelChange,
}: Args) {
  const appTheme = useAppThemeOptional();

  const cells = useMemo(
    () => layout.cells.slice(0, cellCountFor(layout.layoutId)),
    [layout.cells, layout.layoutId],
  );

  const applyCellUpdate = useCallback(
    (index: number, next: CellConfig) => {
      const id = cellChartId(index);
      const prev = getCellConfig(id) ?? cells[index] ?? DEFAULT_CELL;

      if (isDrawingViewportOnlyPatch(prev, next)) {
        setCellConfig(id, next);
        if (layout.linkDrawings) {
          const count = cellCountFor(layout.layoutId);
          for (let i = 0; i < count; i += 1) {
            if (i === index) continue;
            const peerId = cellChartId(i);
            const peer = getCellConfig(peerId) ?? cells[i] ?? DEFAULT_CELL;
            setCellConfig(peerId, { ...peer, drawings: next.drawings });
          }
        }
        scheduleCellLayoutFlush();
        return;
      }

      const nextLayout = applyLinkPropagation(layout, index, next);
      const count = cellCountFor(nextLayout.layoutId);
      for (let i = 0; i < count; i += 1) {
        setCellConfig(cellChartId(i), nextLayout.cells[i]);
      }
      scheduleCellLayoutFlush();
      setLayout(nextLayout);
    },
    [cells, layout, setLayout],
  );

  const handleActiveCellChange = useCallback(
    (index: number) => {
      setLayout((prev) => {
        const maxIndex = cellCountFor(prev.layoutId) - 1;
        const activeCellIndex = Math.max(0, Math.min(index, maxIndex));
        if (activeCellIndex === prev.activeCellIndex) return prev;
        return { ...prev, activeCellIndex };
      });
    },
    [setLayout],
  );

  const handleLayoutChange = useCallback(
    (layoutId: LayoutTemplateId) => {
      setLayout((prev) => applyLayoutTemplateChange(prev, layoutId));
    },
    [setLayout],
  );

  const handleLayoutSyncChange = useCallback(
    (patch: Partial<LayoutSyncPrefs>) => {
      const enablingLinkSymbol = patch.linkSymbol === true && !layout.linkSymbol;
      if (enablingLinkSymbol) {
        const merged = { ...layout, ...patch };
        const activeIndex = merged.activeCellIndex ?? 0;
        const activeCellConfig = cells[activeIndex] ?? DEFAULT_CELL;
        const nextLayout = applyLinkPropagation(merged, activeIndex, activeCellConfig);
        const count = cellCountFor(nextLayout.layoutId);
        for (let i = 0; i < count; i += 1) {
          setCellConfig(cellChartId(i), nextLayout.cells[i]);
        }
        scheduleCellLayoutFlush();
        setLayout(nextLayout);
        return;
      }

      setLayout((prev) => ({ ...prev, ...patch }));
    },
    [cells, layout, setLayout],
  );

  const handleToolbarPrefsChange = useCallback(
    (next: ToolbarPrefs) => {
      setLayout((prev) => ({ ...prev, toolbarPrefs: next }));
    },
    [setLayout],
  );

  const activeCellIndex = layout.activeCellIndex ?? 0;
  const activeCell = cells[activeCellIndex] ?? DEFAULT_CELL;

  const symbolHistory = useSymbolNavigationHistory({
    cells,
    activeCellIndex,
    hydrated,
  });

  const patchActiveCell = useCallback(
    (patch: Partial<CellConfig>) => {
      applyCellUpdate(activeCellIndex, { ...activeCell, ...patch });
    },
    [activeCellIndex, activeCell, applyCellUpdate],
  );

  const applyChartSymbol = useCallback(
    (result: { symbol: string; name: string; exchange: string }) => {
      recordRecentSymbol(result);
      patchActiveCell({
        symbol: result.symbol,
        symbolName: result.name,
        exchange: result.exchange,
      });
    },
    [patchActiveCell],
  );

  useEffect(() => {
    if (!hydrated) return;
    seedRecentSymbols(
      cells
        .filter((cell) => cell.symbol.trim())
        .map((cell) => ({
          symbol: cell.symbol,
          name: cell.symbolName ?? cell.symbol,
          exchange: cell.exchange ?? "",
        })),
    );
  }, [cells, hydrated]);

  const handleChartDeepLink = useCallback(
    (params: ChartDeepLinkParams) => {
      if (!params.symbol) return;
      const validIntervals = new Set<Interval>([
        "1m",
        "5m",
        "15m",
        "30m",
        "1h",
        "2h",
        "1d",
        "1wk",
        "1mo",
      ]);
      const interval =
        params.interval && validIntervals.has(params.interval)
          ? params.interval
          : undefined;
      recordRecentSymbol({
        symbol: params.symbol,
        name: params.symbol,
        exchange: "",
      });
      patchActiveCell({
        symbol: params.symbol,
        symbolName: params.symbol,
        exchange: "",
        ...(interval
          ? {
              interval,
              range: rangeForManualInterval(interval),
              rangePreset: null,
            }
          : {}),
      });
    },
    [patchActiveCell],
  );

  useChartDeepLinkBootstrap(hydrated, handleChartDeepLink);

  const handleSymbolSelect = useCallback(
    (result: { symbol: string; name: string; exchange: string }) => {
      applyChartSymbol(result);
    },
    [applyChartSymbol],
  );

  const addScriptIndicatorToActiveChart = useCallback(
    (params: {
      scriptId: string;
      revision: string;
      name: string;
      pane: "main" | "sub";
    }) => {
      const existing = activeCell.indicators.find(
        (ind) => ind.kind === "script" && ind.scriptId === params.scriptId,
      );
      if (existing) {
        patchActiveCell({
          indicators: activeCell.indicators.map((ind) =>
            ind.id === existing.id ? { ...ind, revision: params.revision, pane: params.pane } : ind,
          ),
        });
        return;
      }
      patchActiveCell({
        indicators: [
          ...activeCell.indicators,
          createScriptIndicatorInstance(params),
        ],
      });
    },
    [activeCell.indicators, patchActiveCell],
  );

  const handleSymbolBack = useCallback(() => {
    const previous = symbolHistory.navigate(activeCellIndex, "back");
    if (!previous) return;
    applyChartSymbol(previous);
  }, [activeCellIndex, applyChartSymbol, symbolHistory]);

  const handleSymbolForward = useCallback(() => {
    const next = symbolHistory.navigate(activeCellIndex, "forward");
    if (!next) return;
    applyChartSymbol(next);
  }, [activeCellIndex, applyChartSymbol, symbolHistory]);

  const handleIntervalChange = useCallback(
    (interval: Interval) => {
      patchActiveCell({
        interval,
        range: rangeForManualInterval(interval),
        rangePreset: null,
      });
    },
    [patchActiveCell],
  );

  const handleChartTypeChange = useCallback(
    (chartType: ChartType) => {
      patchActiveCell({ chartType });
    },
    [patchActiveCell],
  );

  const handleAppThemeChange = useCallback(
    (theme: Theme) => {
      appTheme?.setTheme(theme);
    },
    [appTheme],
  );

  const handleTabRename = useCallback(() => {
    const nextTitle = window.prompt("Rename layout", activeTab.title);
    if (!nextTitle) return;
    setWorkspaceTabs((prev) => renameTab(prev, prev.activeTabId, nextTitle));
  }, [activeTab.title, setWorkspaceTabs]);

  const appActions = useMemo(
    () =>
      buildAppActions({
        layout,
        hydrated: hydratedRef.current,
        applyCellUpdate,
        patchActiveCell,
        setActiveCellIndex: handleActiveCellChange,
        setLayoutId: handleLayoutChange,
        setGridMode: handleLayoutChange,
        setLayoutSync: handleLayoutSyncChange,
        setTheme: handleAppThemeChange,
        setSidebarPanel: handleSidebarPanelChange,
      }),
    [
      layout,
      applyCellUpdate,
      patchActiveCell,
      handleActiveCellChange,
      handleLayoutChange,
      handleLayoutSyncChange,
      handleAppThemeChange,
      handleSidebarPanelChange,
    ],
  );

  return {
    cells,
    activeCellIndex,
    activeCell,
    applyCellUpdate,
    handleActiveCellChange,
    handleLayoutChange,
    handleLayoutSyncChange,
    handleToolbarPrefsChange,
    symbolHistory,
    handleSymbolSelect,
    addScriptIndicatorToActiveChart,
    handleSymbolBack,
    handleSymbolForward,
    handleIntervalChange,
    handleChartTypeChange,
    handleAppThemeChange,
    handleTabRename,
    appActions,
  };
}
