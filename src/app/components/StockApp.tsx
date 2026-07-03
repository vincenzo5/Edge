"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ChartGrid from "./ChartGrid";
import RightSidebar from "./sidebar/RightSidebar";
import SidebarRail from "./sidebar/SidebarRail";
import ChartHeaderBar from "./chart-chrome/ChartHeaderBar";
import { SidebarProvider } from "./SidebarContext";
import { ActiveChartProvider } from "./ActiveChartContext";
import { ChartActionsProvider } from "./ChartActionsContext";
import { AppActionsProvider, buildAppActions } from "./AppActionsContext";
import { WatchlistProvider } from "./watchlist/WatchlistContext";
import { ScreenerProvider } from "./screener/ScreenerProvider";
import { MarketDataProvider } from "./MarketDataProvider";
import { AccountProvider } from "./AccountProvider";
import { RiskSettingsProvider } from "./RiskSettingsProvider";
import { DataHealthProvider } from "./data-health";
import { AiToolsProvider } from "./AiToolsProvider";
import AiSessionBridge from "./AiSessionBridge";
import {
  DEFAULT_CELL,
  DEFAULT_LAYOUT,
  DEFAULT_SIDEBAR_PREFS,
  DEFAULT_TOOLBAR_PREFS,
  applyLinkPropagation,
  applyThemeToRoot,
  cellCountFor,
  type CellConfig,
  type ChartLayout,
  type ChartType,
  type LayoutSyncPrefs,
  type GridMode,
  type SidebarPanelId,
  type Theme,
  type ToolbarPrefs,
} from "@/lib/chartConfig";
import type { Interval } from "@/lib/chart/contracts";
import { loadLayout, saveLayout } from "@/lib/layoutStorage";
import { resolveSidebarPanelWidth } from "@/lib/responsive/sidebarWidth";
import { useChartTemplateLibraryRemoteSync } from "@/lib/persistence/sync/useChartTemplateLibraryRemoteSync";
import { useChartWorkspaceRemoteSync } from "@/lib/persistence/sync/useChartWorkspaceRemoteSync";
import { useResponsiveLayout } from "@/lib/responsive/useResponsiveLayout";
import { ShortcutUIProvider } from "./shortcuts/ShortcutUIContext";
import ShortcutProvider from "./shortcuts/ShortcutProvider";
import { OptionsChainDialog } from "./options/OptionsChainDialog";
import { ScreenerDialog } from "./screener";
import { useSymbolNavigationHistory } from "./chart-chrome/useSymbolNavigationHistory";
import AppHydrationShell from "./chart-cell/AppHydrationShell";

export default function StockApp() {
  const [layout, setLayout] = useState<ChartLayout>(DEFAULT_LAYOUT);
  const [hydrated, setHydrated] = useState(false);
  const [optionsChainOpen, setOptionsChainOpen] = useState(false);
  const [screenerOpen, setScreenerOpen] = useState(false);
  const hydratedRef = useRef(false);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    setLayout(loadLayout());
    hydratedRef.current = true;
    setHydrated(true);
  }, []);

  const handleApplyRemoteLayout = useCallback((remoteLayout: ChartLayout) => {
    setLayout(remoteLayout);
    saveLayout(remoteLayout);
  }, []);

  useChartWorkspaceRemoteSync({
    layout,
    hydrated,
    onApplyRemoteLayout: handleApplyRemoteLayout,
  });

  useChartTemplateLibraryRemoteSync();

  // Apply theme class to <html> when it changes.
  useEffect(() => {
    if (!hydratedRef.current) return;
    applyThemeToRoot(layout.theme);
  }, [layout.theme]);

  // Debounced save on any layout change.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const t = setTimeout(() => saveLayout(layout), 500);
    return () => clearTimeout(t);
  }, [layout]);

  // Ensure cells array matches grid mode count; clamp active cell index.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const needed = cellCountFor(layout.gridMode);
    setLayout((prev) => {
      const cells = [...prev.cells];
      while (cells.length < needed) {
        cells.push({ ...DEFAULT_CELL });
      }
      const trimmed = cells.slice(0, Math.max(needed, cells.length));
      const maxIndex = Math.max(0, needed - 1);
      const activeCellIndex = Math.min(prev.activeCellIndex ?? 0, maxIndex);
      if (
        trimmed.length === prev.cells.length &&
        activeCellIndex === prev.activeCellIndex
      ) {
        return prev;
      }
      return {
        ...prev,
        cells: trimmed,
        activeCellIndex,
      };
    });
  }, [layout.gridMode]);

  const applyCellUpdate = useCallback((index: number, next: CellConfig) => {
    setLayout((prev) => applyLinkPropagation(prev, index, next));
  }, []);

  const handleActiveCellChange = useCallback((index: number) => {
    setLayout((prev) => {
      const maxIndex = cellCountFor(prev.gridMode) - 1;
      const activeCellIndex = Math.max(0, Math.min(index, maxIndex));
      if (activeCellIndex === prev.activeCellIndex) return prev;
      return { ...prev, activeCellIndex };
    });
  }, []);

  const handleGridModeChange = useCallback((mode: GridMode) => {
    setLayout((prev) => ({ ...prev, gridMode: mode }));
  }, []);

  const handleLayoutSyncChange = useCallback((patch: Partial<LayoutSyncPrefs>) => {
    setLayout((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleToolbarPrefsChange = useCallback((next: ToolbarPrefs) => {
    setLayout((prev) => ({ ...prev, toolbarPrefs: next }));
  }, []);

  const handleSidebarPanelChange = useCallback((activePanel: SidebarPanelId | null) => {
    setLayout((prev) => ({
      ...prev,
      sidebar: {
        ...(prev.sidebar ?? DEFAULT_SIDEBAR_PREFS),
        activePanel,
      },
    }));
  }, []);

  const handleSidebarToggle = useCallback((id: SidebarPanelId) => {
    setLayout((prev) => {
      const current = prev.sidebar?.activePanel ?? null;
      return {
        ...prev,
        sidebar: {
          ...(prev.sidebar ?? DEFAULT_SIDEBAR_PREFS),
          activePanel: current === id ? null : id,
        },
      };
    });
  }, []);

  const handleSidebarWidthChange = useCallback((width: number) => {
    setLayout((prev) => ({
      ...prev,
      sidebar: {
        ...(prev.sidebar ?? DEFAULT_SIDEBAR_PREFS),
        width,
      },
    }));
  }, []);

  const cells = useMemo(
    () => layout.cells.slice(0, cellCountFor(layout.gridMode)),
    [layout.cells, layout.gridMode],
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
      patchActiveCell({ interval, rangePreset: null });
    },
    [patchActiveCell],
  );

  const handleChartTypeChange = useCallback(
    (chartType: ChartType) => {
      patchActiveCell({ chartType });
    },
    [patchActiveCell],
  );

  const handleThemeChange = useCallback((theme: Theme) => {
    setLayout((prev) => ({ ...prev, theme }));
  }, []);

  const appActions = useMemo(
    () =>
      buildAppActions({
        layout,
        hydrated: hydratedRef.current,
        applyCellUpdate,
        patchActiveCell,
        setActiveCellIndex: handleActiveCellChange,
        setGridMode: handleGridModeChange,
        setLayoutSync: handleLayoutSyncChange,
        setTheme: handleThemeChange,
        setSidebarPanel: handleSidebarPanelChange,
      }),
    [
      layout,
      applyCellUpdate,
      patchActiveCell,
      handleActiveCellChange,
      handleGridModeChange,
      handleLayoutSyncChange,
      handleThemeChange,
      handleSidebarPanelChange,
    ],
  );

  const responsive = useResponsiveLayout();
  const activePanel = layout.sidebar?.activePanel ?? null;
  const sidebarPanelWidth = resolveSidebarPanelWidth(layout.sidebar?.width);
  const handleSidebarClose = useCallback(() => {
    handleSidebarPanelChange(null);
  }, [handleSidebarPanelChange]);

  const handleOpenOptionsChain = useCallback(() => {
    setOptionsChainOpen(true);
  }, []);

  const handleCloseOptionsChain = useCallback(() => {
    setOptionsChainOpen(false);
  }, []);

  const handleOpenScreener = useCallback(() => {
    setScreenerOpen(true);
  }, []);

  const handleCloseScreener = useCallback(() => {
    setScreenerOpen(false);
  }, []);

  if (!hydrated) {
    return <AppHydrationShell />;
  }

  return (
    <SidebarProvider
      activePanel={layout.sidebar?.activePanel ?? null}
      onActivePanelChange={handleSidebarPanelChange}
    >
      <div className="edge-app-shell flex h-screen min-h-0 flex-col overflow-hidden">
        <ChartActionsProvider
          activeCellSymbol={activeCell.symbol}
          loadSymbolIntoActiveChart={handleSymbolSelect}
        >
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <AppActionsProvider value={appActions}>
            <WatchlistProvider>
              <ScreenerProvider>
              <MarketDataProvider layout={layout}>
              <AccountProvider>
              <RiskSettingsProvider>
              <ActiveChartProvider>
                <DataHealthProvider>
                <ShortcutUIProvider>
                  <ShortcutProvider>
                <AiToolsProvider>
                  <AiSessionBridge />
            <ChartHeaderBar
              layout={{
                layoutName: "Default",
                gridMode: layout.gridMode,
                linkSymbol: layout.linkSymbol,
                linkInterval: layout.linkInterval,
                linkCrosshair: layout.linkCrosshair,
                linkDrawings: layout.linkDrawings,
                theme: layout.theme,
              }}
              chart={{
                symbol: activeCell.symbol,
                interval: activeCell.interval,
                chartType: activeCell.chartType,
              }}
              layoutActions={{
                onGridModeChange: handleGridModeChange,
                onLayoutSyncChange: handleLayoutSyncChange,
                onThemeChange: handleThemeChange,
              }}
              chartActions={{
                onSymbolSelect: handleSymbolSelect,
                onIntervalChange: handleIntervalChange,
                onChartTypeChange: handleChartTypeChange,
                onOpenOptionsChain: handleOpenOptionsChain,
                onOpenScreener: handleOpenScreener,
              }}
              symbolNav={{
                canBack: symbolHistory.canBack,
                canForward: symbolHistory.canForward,
                onBack: handleSymbolBack,
                onForward: handleSymbolForward,
              }}
            />
            <div className="relative flex min-h-0 flex-1">
              <ChartGrid
                gridMode={layout.gridMode}
                linkCrosshair={layout.linkCrosshair}
                linkDrawings={layout.linkDrawings}
                theme={layout.theme}
                cells={cells}
                activeCellIndex={activeCellIndex}
                toolbarPrefs={layout.toolbarPrefs ?? DEFAULT_TOOLBAR_PREFS}
                symbolNav={{
                  canBack: symbolHistory.canBack,
                  canForward: symbolHistory.canForward,
                  onBack: handleSymbolBack,
                  onForward: handleSymbolForward,
                  onSymbolSelect: handleSymbolSelect,
                }}
                onCellChange={applyCellUpdate}
                onActiveCellChange={handleActiveCellChange}
                onToolbarPrefsChange={handleToolbarPrefsChange}
              />
              <OptionsChainDialog open={optionsChainOpen} onClose={handleCloseOptionsChain} />
              <ScreenerDialog open={screenerOpen} onClose={handleCloseScreener} />
              {responsive.sidebarMode === "inline" ? (
                <RightSidebar
                  activePanel={activePanel}
                  mode="inline"
                  width={sidebarPanelWidth}
                  onWidthChange={handleSidebarWidthChange}
                />
              ) : null}
            </div>
            {responsive.sidebarMode === "overlay" ? (
              <RightSidebar
                activePanel={activePanel}
                mode="overlay"
                width={sidebarPanelWidth}
                onWidthChange={handleSidebarWidthChange}
                onClose={handleSidebarClose}
              />
            ) : null}
                </AiToolsProvider>
                  </ShortcutProvider>
                </ShortcutUIProvider>
                </DataHealthProvider>
              </ActiveChartProvider>
              </RiskSettingsProvider>
              </AccountProvider>
              </MarketDataProvider>
              </ScreenerProvider>
            </WatchlistProvider>
          </AppActionsProvider>
        </div>
        <SidebarRail
          theme={layout.theme}
          activePanel={activePanel}
          railMode={responsive.railMode}
          onTogglePanel={handleSidebarToggle}
        />
      </div>
        </ChartActionsProvider>
      </div>
    </SidebarProvider>
  );
}
