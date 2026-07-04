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
  type FloatingPanelGeometry,
  type Theme,
  type ToolbarPrefs,
} from "@/lib/chartConfig";
import type { Interval } from "@/lib/chart/contracts";
import { saveLayout } from "@/lib/layoutStorage";
import { resolveAppBootstrap, type AppBootstrapResult } from "@/lib/app/bootstrap/resolveAppBootstrap";
import type { WatchlistState } from "@/lib/watchlist/types";
import type { ScreenerState } from "@/lib/screener/types";
import type { ScreenerSessionState } from "@/lib/screener/screenerSession";
import { resolveSidebarPanelWidth } from "@/lib/responsive/sidebarWidth";
import { useChartTemplateLibraryRemoteSync } from "@/lib/persistence/sync/useChartTemplateLibraryRemoteSync";
import { useChartWorkspaceRemoteSync } from "@/lib/persistence/sync/useChartWorkspaceRemoteSync";
import { useResponsiveLayout } from "@/lib/responsive/useResponsiveLayout";
import { ShortcutUIProvider } from "./shortcuts/ShortcutUIContext";
import ShortcutProvider from "./shortcuts/ShortcutProvider";
import { PanelPresentationProvider } from "./sidebar/PanelPresentationContext";
import FloatingPanelHost from "./sidebar/FloatingPanelHost";
import {
  defaultFloatingGeometry,
  getPanelPresentation,
} from "@/lib/sidebar/floatingPanelGeometry";
import { useSymbolNavigationHistory } from "./chart-chrome/useSymbolNavigationHistory";
import AppHydrationShell from "./chart-cell/AppHydrationShell";
import { OptionsSessionProvider } from "./options/OptionsSessionProvider";

export default function StockApp() {
  const [layout, setLayout] = useState<ChartLayout>(DEFAULT_LAYOUT);
  const [watchlistBootstrap, setWatchlistBootstrap] = useState<WatchlistState | null>(null);
  const [screenerBootstrap, setScreenerBootstrap] = useState<ScreenerState | null>(null);
  const [screenerSessionBootstrap, setScreenerSessionBootstrap] =
    useState<ScreenerSessionState | null>(null);
  const [bootstrapRemoteApplied, setBootstrapRemoteApplied] = useState(false);
  const [bootstrapRemotePending, setBootstrapRemotePending] = useState(false);
  const finishRemoteLayoutRef = useRef<AppBootstrapResult["finishRemoteLayout"]>(undefined);
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void resolveAppBootstrap().then((result) => {
      if (cancelled) return;
      setLayout(result.layout);
      setWatchlistBootstrap(result.watchlist);
      setScreenerBootstrap(result.screener);
      setScreenerSessionBootstrap(result.screenerSession);
      setBootstrapRemoteApplied(result.remoteApplied);
      setBootstrapRemotePending(result.remotePending);
      finishRemoteLayoutRef.current = result.finishRemoteLayout;
      applyThemeToRoot(result.layout.theme);
      hydratedRef.current = true;
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleApplyRemoteLayout = useCallback((remoteLayout: ChartLayout) => {
    setLayout(remoteLayout);
    saveLayout(remoteLayout);
  }, []);

  const finishRemoteLayout = useCallback(async () => {
    const finish = finishRemoteLayoutRef.current;
    if (!finish) return null;
    return finish();
  }, []);

  useChartWorkspaceRemoteSync({
    layout,
    hydrated,
    bootstrapRemoteApplied,
    bootstrapRemotePending,
    finishRemoteLayout: bootstrapRemotePending ? finishRemoteLayout : undefined,
    onApplyRemoteLayout: handleApplyRemoteLayout,
  });

  useChartTemplateLibraryRemoteSync();

  // Apply theme class to <html> when it changes.
  useEffect(() => {
    if (!hydratedRef.current) return;
    applyThemeToRoot(layout.theme);
  }, [layout.theme, hydrated]);

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

  const handleFloatingGeometryChange = useCallback(
    (panelId: SidebarPanelId, geometry: FloatingPanelGeometry) => {
      setLayout((prev) => ({
        ...prev,
        sidebar: {
          ...(prev.sidebar ?? DEFAULT_SIDEBAR_PREFS),
          floatingGeometry: {
            ...(prev.sidebar?.floatingGeometry),
            [panelId]: geometry,
          },
        },
      }));
    },
    [],
  );

  const handlePanelDock = useCallback((panelId: SidebarPanelId) => {
    setLayout((prev) => ({
      ...prev,
      sidebar: {
        ...(prev.sidebar ?? DEFAULT_SIDEBAR_PREFS),
        presentation: {
          ...(prev.sidebar?.presentation),
          [panelId]: "docked",
        },
      },
    }));
  }, []);

  const handlePanelPopOut = useCallback(() => {
    setLayout((prev) => {
      const panelId = prev.sidebar?.activePanel;
      if (!panelId) return prev;
      const sidebar = prev.sidebar ?? DEFAULT_SIDEBAR_PREFS;
      const geometry =
        sidebar.floatingGeometry?.[panelId] ?? defaultFloatingGeometry(panelId);
      return {
        ...prev,
        sidebar: {
          ...sidebar,
          presentation: {
            ...sidebar.presentation,
            [panelId]: "floating",
          },
          floatingGeometry: {
            ...sidebar.floatingGeometry,
            [panelId]: geometry,
          },
        },
      };
    });
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
  const activePresentation =
    activePanel != null ? getPanelPresentation(layout.sidebar, activePanel) : "docked";
  const isPanelFloating = activePresentation === "floating";

  const handleSidebarClose = useCallback(() => {
    handleSidebarPanelChange(null);
  }, [handleSidebarPanelChange]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (responsive.sidebarMode !== "overlay") return;
    const panelId = layout.sidebar?.activePanel;
    if (!panelId) return;
    if (getPanelPresentation(layout.sidebar, panelId) !== "floating") return;
    handlePanelDock(panelId);
  }, [responsive.sidebarMode, layout.sidebar, handlePanelDock]);

  const panelPresentation = useMemo(
    () => ({
      presentation: activePresentation,
      popOut: handlePanelPopOut,
      dock: () => {
        if (activePanel) handlePanelDock(activePanel);
      },
      canPopOut: responsive.sidebarMode === "inline" && activePanel != null && !isPanelFloating,
      canDock: isPanelFloating,
    }),
    [
      activePresentation,
      activePanel,
      handlePanelDock,
      handlePanelPopOut,
      isPanelFloating,
      responsive.sidebarMode,
    ],
  );

  if (!hydrated) {
    return <AppHydrationShell />;
  }

  return (
    <SidebarProvider
      activePanel={layout.sidebar?.activePanel ?? null}
      onActivePanelChange={handleSidebarPanelChange}
    >
      <div className="edge-app-shell edge-app-enter flex h-screen min-h-0 flex-col overflow-hidden">
        <ChartActionsProvider
          activeCellSymbol={activeCell.symbol}
          loadSymbolIntoActiveChart={handleSymbolSelect}
        >
          <AppActionsProvider value={appActions}>
            <WatchlistProvider initialState={watchlistBootstrap ?? undefined}>
              <ScreenerProvider
                initialState={screenerBootstrap ?? undefined}
                initialSession={screenerSessionBootstrap ?? undefined}
              >
              <MarketDataProvider layout={layout}>
              <AccountProvider>
              <RiskSettingsProvider>
              <PanelPresentationProvider value={panelPresentation}>
              <ActiveChartProvider>
                <OptionsSessionProvider>
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
              }}
              chartActions={{
                onSymbolSelect: handleSymbolSelect,
                onIntervalChange: handleIntervalChange,
                onChartTypeChange: handleChartTypeChange,
              }}
              symbolNav={{
                canBack: symbolHistory.canBack,
                canForward: symbolHistory.canForward,
                onBack: handleSymbolBack,
                onForward: handleSymbolForward,
              }}
            />
            <div className="flex min-h-0 flex-1 overflow-hidden">
              <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
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
                  <FloatingPanelHost
                    activePanel={activePanel}
                    sidebar={layout.sidebar}
                    onGeometryChange={handleFloatingGeometryChange}
                    onDock={handlePanelDock}
                    onClose={handleSidebarClose}
                  />
                  {responsive.sidebarMode === "inline" ? (
                    <RightSidebar
                      activePanel={activePanel}
                      mode="inline"
                      width={sidebarPanelWidth}
                      isFloating={isPanelFloating}
                      onWidthChange={handleSidebarWidthChange}
                    />
                  ) : null}
                </div>
                {responsive.sidebarMode === "overlay" ? (
                  <RightSidebar
                    activePanel={activePanel}
                    mode="overlay"
                    width={sidebarPanelWidth}
                    isFloating={isPanelFloating}
                    onWidthChange={handleSidebarWidthChange}
                    onClose={handleSidebarClose}
                  />
                ) : null}
              </div>
              <SidebarRail
                theme={layout.theme}
                activePanel={activePanel}
                railMode={responsive.railMode}
                onTogglePanel={handleSidebarToggle}
                onThemeChange={handleThemeChange}
              />
            </div>
                </AiToolsProvider>
                  </ShortcutProvider>
                </ShortcutUIProvider>
                </DataHealthProvider>
                </OptionsSessionProvider>
              </ActiveChartProvider>
              </PanelPresentationProvider>
              </RiskSettingsProvider>
              </AccountProvider>
              </MarketDataProvider>
              </ScreenerProvider>
            </WatchlistProvider>
          </AppActionsProvider>
        </ChartActionsProvider>
      </div>
    </SidebarProvider>
  );
}
