"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from "react";
import ChartGrid from "./ChartGrid";
import RightSidebar from "./sidebar/RightSidebar";
import SidebarRail from "./sidebar/SidebarRail";
import ChartHeaderBar from "./chart-chrome/ChartHeaderBar";
import { TradeSetupBindingProvider, useTradeSetupBinding } from "./trading/TradeSetupBindingContext";
import { SidebarProvider } from "./SidebarContext";
import { ActiveChartProvider } from "./ActiveChartContext";
import { ChartActionsProvider } from "./ChartActionsContext";
import { AppActionsProvider, buildAppActions } from "./AppActionsContext";
import { WatchlistProvider } from "./watchlist/WatchlistContext";
import { ScreenerProvider } from "./screener/ScreenerProvider";
import { MarketDataProvider } from "./MarketDataProvider";
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
  applyLayoutTemplateChange,
  applyThemeToRoot,
  cellCountFor,
  type CellConfig,
  type ChartLayout,
  type ChartType,
  type LayoutSyncPrefs,
  type LayoutTemplateId,
  type SidebarPanelId,
  type FloatingPanelGeometry,
  type Theme,
  type ToolbarPrefs,
} from "@/lib/chartConfig";
import type { Interval } from "@/lib/chart/contracts";
import { rangeForManualInterval } from "@/lib/chart/rangeInterval";
import { useChartDeepLinkBootstrap } from "@/app/components/journal/JournalChartOverlayProvider";
import type { ChartDeepLinkParams } from "@/lib/journal/chartDeepLink";
import { saveWorkspaceTabs } from "@/lib/app/workspaceTabsStorage";
import {
  cloneLayoutForNewTab,
  closeTab,
  createDefaultWorkspaceTabs,
  createTab,
  getActiveLayout,
  getActiveTab,
  getTabPrimarySymbol,
  renameTab,
  switchTab,
  updateActiveTabLayout,
  type WorkspaceTabsState,
} from "@/lib/app/workspaceTabs";
import {
  mergeWorkspaceTabsApply,
  type ApplyWorkspaceTabsOptions,
} from "@/lib/persistence/sync/useWorkspaceTabsRemoteSync";
import { resolveAppBootstrap, type AppBootstrapResult } from "@/lib/app/bootstrap/resolveAppBootstrap";
import { loadLocalAppState } from "@/lib/app/bootstrap/loadLocalAppState";
import type { WatchlistState } from "@/lib/watchlist/types";
import type { ScreenerState } from "@/lib/screener/types";
import type { ScreenerSessionState } from "@/lib/screener/screenerSession";
import { createDefaultScreenerSession } from "@/lib/screener/screenerSession";
import { resolveSidebarPanelWidth, computeScreenerExpandedSidebarWidth, clampSidebarWidthOnPanelLeave } from "@/lib/responsive/sidebarWidth";
import {
  LAYOUT_DIMENSIONS,
  RESPONSIVE_BREAKPOINTS,
} from "@/lib/responsive/layoutConstants";
import { useChartTemplateLibraryRemoteSync } from "@/lib/persistence/sync/useChartTemplateLibraryRemoteSync";
import { reconcileChartWorkspacesAfterTabClose } from "@/lib/persistence/sync/reconcileChartWorkspaces";
import { useWorkspaceTabsRemoteSync } from "@/lib/persistence/sync/useWorkspaceTabsRemoteSync";
import WorkspaceTabBar from "./chart-chrome/WorkspaceTabBar";
import { useResponsiveLayout } from "@/lib/responsive/useResponsiveLayout";
import { ShortcutUIProvider } from "./shortcuts/ShortcutUIContext";
import ShortcutProvider from "./shortcuts/ShortcutProvider";
import { PanelPresentationProvider } from "./sidebar/PanelPresentationContext";
import { SidebarPanelWidthProvider } from "./sidebar/SidebarPanelWidthContext";
import FloatingPanelHost from "./sidebar/FloatingPanelHost";
import {
  defaultFloatingGeometry,
  getPanelPresentation,
} from "@/lib/sidebar/floatingPanelGeometry";
import { useSymbolNavigationHistory } from "./chart-chrome/useSymbolNavigationHistory";
import AppHydrationShell from "./chart-cell/AppHydrationShell";
import { OptionsSessionProvider } from "./options/OptionsSessionProvider";

export default function StockApp() {
  const [workspaceTabs, setWorkspaceTabs] = useState<WorkspaceTabsState>(() =>
    createDefaultWorkspaceTabs(),
  );
  const [watchlistBootstrap, setWatchlistBootstrap] = useState<WatchlistState | null>(null);
  const [screenerBootstrap, setScreenerBootstrap] = useState<ScreenerState | null>(null);
  const [screenerSessionBootstrap, setScreenerSessionBootstrap] =
    useState<ScreenerSessionState | null>(null);
  const [bootstrapRemoteApplied, setBootstrapRemoteApplied] = useState(false);
  const [bootstrapRemotePending, setBootstrapRemotePending] = useState(false);
  const finishRemoteWorkspaceMergeRef =
    useRef<AppBootstrapResult["finishRemoteWorkspaceMerge"]>(undefined);
  const [hydrated, setHydrated] = useState(false);
  const [screenerPanelExpanded, setScreenerPanelExpanded] = useState(false);
  const screenerPreExpandWidthRef = useRef<number | null>(null);
  const hydratedRef = useRef(false);
  const workspaceTabsRef = useRef(workspaceTabs);
  const flushActiveTabSaveRef = useRef<() => Promise<void>>(async () => {});

  workspaceTabsRef.current = workspaceTabs;

  const layout = useMemo(() => getActiveLayout(workspaceTabs), [workspaceTabs]);
  const activeTab = useMemo(() => getActiveTab(workspaceTabs), [workspaceTabs]);
  const workspaceTabSymbols = useMemo(
    () => workspaceTabs.tabs.map((tab) => getTabPrimarySymbol(tab)),
    [workspaceTabs.tabs],
  );

  const setLayout = useCallback(
    (updater: ChartLayout | ((prev: ChartLayout) => ChartLayout)) => {
      setWorkspaceTabs((prev) => updateActiveTabLayout(prev, updater));
    },
    [],
  );

  const applyBootstrapResult = useCallback((result: AppBootstrapResult) => {
    workspaceTabsRef.current = result.workspaceTabs;
    setWorkspaceTabs(result.workspaceTabs);
    saveWorkspaceTabs(result.workspaceTabs);
    setWatchlistBootstrap(result.watchlist);
    setScreenerBootstrap(result.screener);
    setScreenerSessionBootstrap(result.screenerSession);
    setBootstrapRemoteApplied(result.remoteApplied);
    setBootstrapRemotePending(result.remotePending);
    finishRemoteWorkspaceMergeRef.current = result.finishRemoteWorkspaceMerge;
    applyThemeToRoot(getActiveLayout(result.workspaceTabs).theme);
    hydratedRef.current = true;
    setHydrated(true);
  }, []);

  const hydrateFromLocalFallback = useCallback(() => {
    try {
      const local = loadLocalAppState();
      applyBootstrapResult({
        workspaceTabs: local.workspaceTabs,
        watchlist: local.watchlist,
        screener: local.screener,
        screenerSession: createDefaultScreenerSession(local.screener),
        remoteApplied: false,
        remotePending: false,
      });
    } catch {
      hydratedRef.current = true;
      setHydrated(true);
    }
  }, [applyBootstrapResult]);

  useEffect(() => {
    let cancelled = false;
    void resolveAppBootstrap()
      .then((result) => {
        if (cancelled) return;
        try {
          applyBootstrapResult(result);
        } catch {
          if (!cancelled) {
            hydrateFromLocalFallback();
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          hydrateFromLocalFallback();
        }
      });
    return () => {
      cancelled = true;
    };
  }, [applyBootstrapResult, hydrateFromLocalFallback]);

  const handleApplyWorkspaceTabs = useCallback(
    (incoming: WorkspaceTabsState, applyOptions?: ApplyWorkspaceTabsOptions) => {
      setWorkspaceTabs((current) => {
        const next = mergeWorkspaceTabsApply(current, incoming, applyOptions);
        workspaceTabsRef.current = next;
        saveWorkspaceTabs(next);
        return next;
      });
    },
    [],
  );

  const finishRemoteWorkspaceMerge = useCallback(async () => {
    const finish = finishRemoteWorkspaceMergeRef.current;
    if (!finish) return null;
    return finish();
  }, []);

  const { flushActiveTabSave } = useWorkspaceTabsRemoteSync({
    workspaceTabs,
    hydrated,
    bootstrapRemoteApplied,
    bootstrapRemotePending,
    finishRemoteWorkspaceMerge: bootstrapRemotePending ? finishRemoteWorkspaceMerge : undefined,
    onApplyWorkspaceTabs: handleApplyWorkspaceTabs,
  });

  useEffect(() => {
    flushActiveTabSaveRef.current = flushActiveTabSave;
  }, [flushActiveTabSave]);

  useChartTemplateLibraryRemoteSync();

  // Apply theme class to <html> when it changes.
  useEffect(() => {
    if (!hydratedRef.current) return;
    applyThemeToRoot(layout.theme);
  }, [layout.theme, hydrated]);

  // Debounced save on any workspace tab change.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const t = setTimeout(() => saveWorkspaceTabs(workspaceTabs), 500);
    return () => clearTimeout(t);
  }, [workspaceTabs]);

  const applyCellUpdate = useCallback((index: number, next: CellConfig) => {
    setLayout((prev) => applyLinkPropagation(prev, index, next));
  }, []);

  const handleActiveCellChange = useCallback((index: number) => {
    setLayout((prev) => {
      const maxIndex = cellCountFor(prev.layoutId) - 1;
      const activeCellIndex = Math.max(0, Math.min(index, maxIndex));
      if (activeCellIndex === prev.activeCellIndex) return prev;
      return { ...prev, activeCellIndex };
    });
  }, []);

  const handleLayoutChange = useCallback((layoutId: LayoutTemplateId) => {
    setLayout((prev) => applyLayoutTemplateChange(prev, layoutId));
  }, []);

  const handleLayoutSyncChange = useCallback((patch: Partial<LayoutSyncPrefs>) => {
    setLayout((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleToolbarPrefsChange = useCallback((next: ToolbarPrefs) => {
    setLayout((prev) => ({ ...prev, toolbarPrefs: next }));
  }, []);

  const handleSidebarPanelChange = useCallback((activePanel: SidebarPanelId | null) => {
    setLayout((prev) => {
      const prevPanel = prev.sidebar?.activePanel ?? null;
      const storedWidth = prev.sidebar?.width;
      const shouldClamp =
        prevPanel === "screener" &&
        activePanel !== "screener" &&
        typeof storedWidth === "number";
      return {
        ...prev,
        sidebar: {
          ...(prev.sidebar ?? DEFAULT_SIDEBAR_PREFS),
          activePanel,
          ...(shouldClamp ? { width: clampSidebarWidthOnPanelLeave(storedWidth) } : {}),
        },
      };
    });
    setScreenerPanelExpanded(false);
    screenerPreExpandWidthRef.current = null;
  }, []);

  const handleSidebarToggle = useCallback((id: SidebarPanelId) => {
    setLayout((prev) => {
      const current = prev.sidebar?.activePanel ?? null;
      const nextPanel = current === id ? null : id;
      const storedWidth = prev.sidebar?.width;
      const shouldClamp =
        current === "screener" &&
        nextPanel !== "screener" &&
        typeof storedWidth === "number";
      if (current === "screener" && nextPanel !== "screener") {
        setScreenerPanelExpanded(false);
        screenerPreExpandWidthRef.current = null;
      }
      return {
        ...prev,
        sidebar: {
          ...(prev.sidebar ?? DEFAULT_SIDEBAR_PREFS),
          activePanel: nextPanel,
          ...(shouldClamp ? { width: clampSidebarWidthOnPanelLeave(storedWidth) } : {}),
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
  }, [activeCellIndex, activeCell.symbol, patchActiveCell, symbolHistory]);

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

  const handleThemeChange = useCallback((theme: Theme) => {
    setLayout((prev) => ({ ...prev, theme }));
  }, [setLayout]);

  const runWithFlush = useCallback(async (action: () => void | Promise<void>) => {
    await flushActiveTabSaveRef.current();
    await action();
  }, []);

  const handleTabSelect = useCallback(
    (tabId: string) => {
      void runWithFlush(() => {
        setWorkspaceTabs((prev) => switchTab(prev, tabId));
      });
    },
    [runWithFlush],
  );

  const handleTabCreate = useCallback(() => {
    void runWithFlush(() => {
      setWorkspaceTabs((prev) =>
        createTab(prev, {
          layout: cloneLayoutForNewTab(getActiveLayout(prev)),
        }),
      );
    });
  }, [runWithFlush]);

  const handleTabClose = useCallback(
    (tabId: string) => {
      void runWithFlush(async () => {
        const current = workspaceTabsRef.current;
        const tab = current.tabs.find((t) => t.id === tabId);
        const remoteId = tab?.remote?.resourceId;
        const next = closeTab(current, tabId);
        if (next === current) return;
        workspaceTabsRef.current = next;
        setWorkspaceTabs(next);
        saveWorkspaceTabs(next);
        const { failed } = await reconcileChartWorkspacesAfterTabClose(next, remoteId);
        if (failed.length > 0 && process.env.NODE_ENV !== "production") {
          console.warn(
            "[Edge] Some chart workspaces could not be archived in Postgres:",
            failed,
          );
        }
      });
    },
    [runWithFlush],
  );

  const handleTabRename = useCallback(() => {
    const nextTitle = window.prompt("Rename layout", activeTab.title);
    if (!nextTitle) return;
    setWorkspaceTabs((prev) => renameTab(prev, prev.activeTabId, nextTitle));
  }, [activeTab.title]);

  const handleTabCopy = useCallback(() => {
    void runWithFlush(() => {
      setWorkspaceTabs((prev) => {
        const source = getActiveTab(prev);
        return createTab(prev, {
          title: `${source.title} copy`,
          layout: cloneLayoutForNewTab(source.layout),
        });
      });
    });
  }, [runWithFlush]);

  const workspaceMenuTabs = useMemo(
    () =>
      workspaceTabs.tabs.map((tab) => ({
        id: tab.id,
        title: tab.title,
        selected: tab.id === workspaceTabs.activeTabId,
      })),
    [workspaceTabs],
  );

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

  const responsive = useResponsiveLayout();
  const activePanel = layout.sidebar?.activePanel ?? null;
  const sidebarRailWidth =
    responsive.railMode === "compact"
      ? LAYOUT_DIMENSIONS.compactSidebarRailWidth
      : LAYOUT_DIMENSIONS.sidebarRailWidth;
  const sidebarPanelWidth = resolveSidebarPanelWidth(
    layout.sidebar?.width,
    activePanel,
    responsive.viewportWidth,
    sidebarRailWidth,
  );
  const activePresentation =
    activePanel != null ? getPanelPresentation(layout.sidebar, activePanel) : "docked";
  const isPanelFloating = activePresentation === "floating";

  const handleSidebarClose = useCallback(() => {
    handleSidebarPanelChange(null);
  }, [handleSidebarPanelChange]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (responsive.viewportWidth >= RESPONSIVE_BREAKPOINTS.tablet) return;
    const panelId = layout.sidebar?.activePanel;
    if (!panelId) return;
    if (getPanelPresentation(layout.sidebar, panelId) !== "floating") return;
    handlePanelDock(panelId);
  }, [responsive.viewportWidth, layout.sidebar, handlePanelDock]);

  const panelPresentation = useMemo(
    () => ({
      presentation: activePresentation,
      popOut: handlePanelPopOut,
      dock: () => {
        if (activePanel) handlePanelDock(activePanel);
      },
      canPopOut: activePanel != null && !isPanelFloating,
      canDock: isPanelFloating,
    }),
    [
      activePresentation,
      activePanel,
      handlePanelDock,
      handlePanelPopOut,
      isPanelFloating,
    ],
  );

  const handleScreenerExpand = useCallback(() => {
    screenerPreExpandWidthRef.current = sidebarPanelWidth;
    setScreenerPanelExpanded(true);
    const fillWidth = computeScreenerExpandedSidebarWidth(
      responsive.viewportWidth,
      sidebarRailWidth,
    );
    handleSidebarWidthChange(fillWidth);
  }, [
    handleSidebarWidthChange,
    responsive.viewportWidth,
    sidebarPanelWidth,
    sidebarRailWidth,
  ]);

  const handleScreenerCollapse = useCallback(() => {
    const restore =
      screenerPreExpandWidthRef.current ?? LAYOUT_DIMENSIONS.sidebarPanelWidth;
    setScreenerPanelExpanded(false);
    screenerPreExpandWidthRef.current = null;
    handleSidebarWidthChange(restore);
  }, [handleSidebarWidthChange]);

  const sidebarPanelWidthContext = useMemo(
    () => ({
      panelWidth: sidebarPanelWidth,
      viewportWidth: responsive.viewportWidth,
      isExpanded: screenerPanelExpanded,
      canExpand: activePanel === "screener" && !isPanelFloating,
      expand: handleScreenerExpand,
      collapse: handleScreenerCollapse,
    }),
    [
      activePanel,
      handleScreenerCollapse,
      handleScreenerExpand,
      isPanelFloating,
      responsive.viewportWidth,
      screenerPanelExpanded,
      sidebarPanelWidth,
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
      <TradeSetupBindingProvider>
      <div className="edge-app-shell edge-app-enter flex h-full min-h-0 flex-col overflow-hidden">
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
              <MarketDataProvider layout={layout} extraSymbols={workspaceTabSymbols}>
              <RiskSettingsProvider>
              <PanelPresentationProvider value={panelPresentation}>
              <SidebarPanelWidthProvider value={sidebarPanelWidthContext}>
              <ActiveChartProvider>
                <OptionsSessionProvider>
                <DataHealthProvider>
                <ShortcutUIProvider>
                  <ShortcutProvider>
                <AiToolsProvider>
                  <AiSessionBridge />
            <WorkspaceTabBar
              workspaceTabs={workspaceTabs}
              onTabSelect={handleTabSelect}
              onTabCreate={handleTabCreate}
              onTabClose={handleTabClose}
            />
            <ChartHeaderBarWithTrade
              layout={{
                layoutName: activeTab.title,
                layoutId: layout.layoutId,
                linkSymbol: layout.linkSymbol,
                linkInterval: layout.linkInterval,
                linkCrosshair: layout.linkCrosshair,
                linkDrawings: layout.linkDrawings,
                theme: layout.theme,
              }}
              workspaceActions={{
                workspaceTabs: workspaceMenuTabs,
                onCreateLayout: handleTabCreate,
                onCopyLayout: handleTabCopy,
                onRenameLayout: handleTabRename,
                onSelectLayout: handleTabSelect,
              }}
              chart={{
                symbol: activeCell.symbol,
                interval: activeCell.interval,
                chartType: activeCell.chartType,
              }}
              layoutActions={{
                onLayoutChange: handleLayoutChange,
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
                    layoutId={layout.layoutId}
                    linkCrosshair={layout.linkCrosshair}
                    linkDrawings={layout.linkDrawings}
                    theme={layout.theme}
                    cells={cells}
                    activeCellIndex={activeCellIndex}
                    toolbarPrefs={layout.toolbarPrefs ?? DEFAULT_TOOLBAR_PREFS}
                    railMode={responsive.railMode}
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
                  <RightSidebar
                    activePanel={activePanel}
                    mode="overlay"
                    width={sidebarPanelWidth}
                    viewportWidth={responsive.viewportWidth}
                    railWidth={sidebarRailWidth}
                    isFloating={isPanelFloating}
                    onWidthChange={handleSidebarWidthChange}
                    onClose={handleSidebarClose}
                  />
                </div>
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
              </SidebarPanelWidthProvider>
              </PanelPresentationProvider>
              </RiskSettingsProvider>
              </MarketDataProvider>
              </ScreenerProvider>
            </WatchlistProvider>
          </AppActionsProvider>
        </ChartActionsProvider>
      </div>
      </TradeSetupBindingProvider>
    </SidebarProvider>
  );
}

type ChartHeaderBarWithTradeProps = Omit<ComponentProps<typeof ChartHeaderBar>, "onOpenTrade">;

function ChartHeaderBarWithTrade(props: ChartHeaderBarWithTradeProps) {
  const { openTradePanel } = useTradeSetupBinding();
  return <ChartHeaderBar {...props} onOpenTrade={openTradePanel} />;
}
