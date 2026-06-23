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
import { AiToolsProvider } from "./AiToolsProvider";
import AiSessionBridge from "./AiSessionBridge";
import {
  DEFAULT_CELL,
  DEFAULT_LAYOUT,
  DEFAULT_SIDEBAR_PREFS,
  DEFAULT_TOOLBAR_PREFS,
  cellCountFor,
  pickLinkFields,
  type CellConfig,
  type ChartLayout,
  type ChartType,
  type GridMode,
  type SidebarPanelId,
  type Theme,
  type ToolbarPrefs,
} from "@/lib/chartConfig";
import type { Interval } from "@/lib/chart/contracts";
import { loadLayout, saveLayout } from "@/lib/layoutStorage";

export default function StockApp() {
  const [layout, setLayout] = useState<ChartLayout>(DEFAULT_LAYOUT);
  const hydratedRef = useRef(false);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    setLayout(loadLayout());
    hydratedRef.current = true;
  }, []);

  // Apply theme class to <html> when it changes.
  useEffect(() => {
    if (!hydratedRef.current) return;
    document.documentElement.className = layout.theme;
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
    setLayout((prev) => {
      const count = cellCountFor(prev.gridMode);
      const cells = [...prev.cells];
      cells[index] = next;
      if (prev.linked) {
        const linkFields = pickLinkFields(next);
        for (let i = 0; i < count; i++) {
          if (i !== index) {
            cells[i] = { ...cells[i], ...linkFields };
          }
        }
      }
      return { ...prev, cells };
    });
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

  const handleLinkedChange = useCallback((linked: boolean) => {
    setLayout((prev) => ({ ...prev, linked }));
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

  const cells = useMemo(
    () => layout.cells.slice(0, cellCountFor(layout.gridMode)),
    [layout.cells, layout.gridMode],
  );

  const activeCellIndex = layout.activeCellIndex ?? 0;
  const activeCell = cells[activeCellIndex] ?? DEFAULT_CELL;

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
        setLinked: handleLinkedChange,
        setTheme: handleThemeChange,
        setSidebarPanel: handleSidebarPanelChange,
      }),
    [
      layout,
      applyCellUpdate,
      patchActiveCell,
      handleActiveCellChange,
      handleGridModeChange,
      handleLinkedChange,
      handleThemeChange,
      handleSidebarPanelChange,
    ],
  );

  return (
    <SidebarProvider
      activePanel={layout.sidebar?.activePanel ?? null}
      onActivePanelChange={handleSidebarPanelChange}
    >
      <div className="flex h-screen min-h-0 flex-col overflow-hidden">
        <ChartActionsProvider
          activeCellSymbol={activeCell.symbol}
          loadSymbolIntoActiveChart={handleSymbolSelect}
        >
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <AppActionsProvider value={appActions}>
            <WatchlistProvider>
              <ActiveChartProvider>
                <AiToolsProvider>
                  <AiSessionBridge />
            <ChartHeaderBar
              layout={{
                layoutName: "Default",
                gridMode: layout.gridMode,
                linked: layout.linked,
                theme: layout.theme,
              }}
              chart={{
                symbol: activeCell.symbol,
                interval: activeCell.interval,
                chartType: activeCell.chartType,
              }}
              layoutActions={{
                onGridModeChange: handleGridModeChange,
                onLinkedChange: handleLinkedChange,
              }}
              chartActions={{
                onSymbolSelect: handleSymbolSelect,
                onIntervalChange: handleIntervalChange,
                onChartTypeChange: handleChartTypeChange,
              }}
            />
            <div className="flex min-h-0 flex-1">
              <ChartGrid
                gridMode={layout.gridMode}
                linked={layout.linked}
                theme={layout.theme}
                cells={cells}
                activeCellIndex={activeCellIndex}
                toolbarPrefs={layout.toolbarPrefs ?? DEFAULT_TOOLBAR_PREFS}
                onCellChange={applyCellUpdate}
                onActiveCellChange={handleActiveCellChange}
                onToolbarPrefsChange={handleToolbarPrefsChange}
              />
              <RightSidebar activePanel={layout.sidebar?.activePanel ?? null} />
            </div>
                </AiToolsProvider>
          </ActiveChartProvider>
            </WatchlistProvider>
          </AppActionsProvider>
        </div>
        <SidebarRail
          theme={layout.theme}
          activePanel={layout.sidebar?.activePanel ?? null}
          onTogglePanel={handleSidebarToggle}
        />
      </div>
        </ChartActionsProvider>
      </div>
    </SidebarProvider>
  );
}
