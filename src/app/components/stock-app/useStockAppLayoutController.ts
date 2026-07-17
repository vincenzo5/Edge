"use client";

import { useCallback, useMemo } from "react";
import {
  DEFAULT_CELL,
  DEFAULT_TOOLBAR_PREFS,
  applyLinkPropagation,
  applyLayoutTemplateChange,
  cellCountFor,
  type CellConfig,
  type ChartLayout,
  type ChartType,
  type LayoutSyncPrefs,
  type LayoutTemplateId,
  type SidebarPanelId,
  type Theme,
  type ToolbarPrefs,
} from "@/lib/chartConfig";
import type { Interval } from "@/lib/chart/contracts";
import { rangeForManualInterval } from "@/lib/chart/rangeInterval";
import { useChartDeepLinkBootstrap } from "@/app/components/journal/JournalChartOverlayProvider";
import type { ChartDeepLinkParams } from "@/lib/journal/chartDeepLink";
import { renameTab, type WorkspaceTabsState } from "@/lib/app/workspaceTabs";
import { buildAppActions } from "../AppActionsContext";
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
  const applyCellUpdate = useCallback(
    (index: number, next: CellConfig) => {
      setLayout((prev) => applyLinkPropagation(prev, index, next));
    },
    [setLayout],
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
      setLayout((prev) => ({ ...prev, ...patch }));
    },
    [setLayout],
  );

  const handleToolbarPrefsChange = useCallback(
    (next: ToolbarPrefs) => {
      setLayout((prev) => ({ ...prev, toolbarPrefs: next }));
    },
    [setLayout],
  );

  const cells = useMemo(
    () => layout.cells.slice(0, cellCountFor(layout.layoutId)),
    [layout.cells, layout.layoutId],
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
      patchActiveCell({
        symbol: params.symbol,
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
      patchActiveCell({
        symbol: result.symbol,
        symbolName: result.name,
        exchange: result.exchange,
      });
    },
    [patchActiveCell],
  );

  const handleSymbolBack = useCallback(() => {
    const previous = symbolHistory.navigate(activeCellIndex, "back");
    if (!previous) return;
    patchActiveCell({
      symbol: previous.symbol,
      symbolName: previous.name,
      exchange: previous.exchange,
    });
  }, [activeCellIndex, patchActiveCell, symbolHistory]);

  const handleSymbolForward = useCallback(() => {
    const next = symbolHistory.navigate(activeCellIndex, "forward");
    if (!next) return;
    patchActiveCell({
      symbol: next.symbol,
      symbolName: next.name,
      exchange: next.exchange,
    });
  }, [activeCellIndex, patchActiveCell, symbolHistory]);

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

  const handleThemeChange = useCallback(
    (theme: Theme) => {
      setLayout((prev) => ({ ...prev, theme }));
    },
    [setLayout],
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
        setTheme: handleThemeChange,
        setSidebarPanel: handleSidebarPanelChange,
      }),
    [
      layout,
      applyCellUpdate,
      patchActiveCell,
      handleActiveCellChange,
      handleLayoutChange,
      handleLayoutSyncChange,
      handleThemeChange,
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
    handleSymbolBack,
    handleSymbolForward,
    handleIntervalChange,
    handleChartTypeChange,
    handleThemeChange,
    handleTabRename,
    appActions,
  };
}
