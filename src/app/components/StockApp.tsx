"use client";

import { type ComponentProps } from "react";
import ChartGrid from "./ChartGrid";
import RightSidebar from "./sidebar/RightSidebar";
import SidebarRail from "./sidebar/SidebarRail";
import ChartHeaderBar from "./chart-chrome/ChartHeaderBar";
import { useTradeSetupBinding } from "./trading/TradeSetupBindingContext";
import { DEFAULT_TOOLBAR_PREFS } from "@/lib/chartConfig";
import AppHydrationShell from "./chart-cell/AppHydrationShell";
import FloatingPanelHost from "./sidebar/FloatingPanelHost";
import { useStockAppBootstrap } from "./stock-app/useStockAppBootstrap";
import { useStockAppSidebarController } from "./stock-app/useStockAppSidebarController";
import { useStockAppLayoutController } from "./stock-app/useStockAppLayoutController";
import { AppProviders } from "./stock-app/AppProviders";

type Props = {
  /** When true, publishes live quote to the browser tab title. */
  isPrimaryChart?: boolean;
};

export default function StockApp({ isPrimaryChart = true }: Props) {
  const bootstrap = useStockAppBootstrap();
  const sidebar = useStockAppSidebarController({
    layout: bootstrap.layout,
    setLayout: bootstrap.setLayout,
    hydratedRef: bootstrap.hydratedRef,
  });
  const layoutController = useStockAppLayoutController({
    layout: bootstrap.layout,
    setLayout: bootstrap.setLayout,
    workspaceTabs: bootstrap.workspaceTabs,
    setWorkspaceTabs: bootstrap.setWorkspaceTabs,
    activeTab: bootstrap.activeTab,
    hydrated: bootstrap.hydrated,
    hydratedRef: bootstrap.hydratedRef,
    handleSidebarPanelChange: sidebar.handleSidebarPanelChange,
  });

  if (!bootstrap.hydrated) {
    return <AppHydrationShell />;
  }

  return (
    <AppProviders
      layout={bootstrap.layout}
      activePanel={sidebar.activePanel}
      activeCellSymbol={layoutController.activeCell.symbol}
      watchlistBootstrap={bootstrap.watchlistBootstrap}
      screenerBootstrap={bootstrap.screenerBootstrap}
      screenerSessionBootstrap={bootstrap.screenerSessionBootstrap}
      appActions={layoutController.appActions}
      panelPresentation={sidebar.panelPresentation}
      sidebarPanelWidthContext={sidebar.sidebarPanelWidthContext}
      onSidebarPanelChange={sidebar.handleSidebarPanelChange}
      onSymbolSelect={layoutController.handleSymbolSelect}
      isPrimaryChart={isPrimaryChart}
    >
      <ChartHeaderBarWithTrade
        layout={{
          layoutName: bootstrap.activeTab.title,
          layoutId: bootstrap.layout.layoutId,
          linkSymbol: bootstrap.layout.linkSymbol,
          linkInterval: bootstrap.layout.linkInterval,
          linkCrosshair: bootstrap.layout.linkCrosshair,
          linkDrawings: bootstrap.layout.linkDrawings,
          theme: bootstrap.layout.theme,
        }}
        workspaceActions={{
          onRenameLayout: layoutController.handleTabRename,
        }}
        chart={{
          symbol: layoutController.activeCell.symbol,
          interval: layoutController.activeCell.interval,
          chartType: layoutController.activeCell.chartType,
        }}
        layoutActions={{
          onLayoutChange: layoutController.handleLayoutChange,
          onLayoutSyncChange: layoutController.handleLayoutSyncChange,
        }}
        chartActions={{
          onSymbolSelect: layoutController.handleSymbolSelect,
          onIntervalChange: layoutController.handleIntervalChange,
          onChartTypeChange: layoutController.handleChartTypeChange,
        }}
        symbolNav={{
          canBack: layoutController.symbolHistory.canBack,
          canForward: layoutController.symbolHistory.canForward,
          onBack: layoutController.handleSymbolBack,
          onForward: layoutController.handleSymbolForward,
        }}
      />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="relative flex min-h-0 flex-1">
            <ChartGrid
              layoutId={bootstrap.layout.layoutId}
              linkCrosshair={bootstrap.layout.linkCrosshair}
              linkDrawings={bootstrap.layout.linkDrawings}
              theme={bootstrap.layout.theme}
              cells={layoutController.cells}
              activeCellIndex={layoutController.activeCellIndex}
              toolbarPrefs={bootstrap.layout.toolbarPrefs ?? DEFAULT_TOOLBAR_PREFS}
              railMode={sidebar.responsive.railMode}
              symbolNav={{
                canBack: layoutController.symbolHistory.canBack,
                canForward: layoutController.symbolHistory.canForward,
                onBack: layoutController.handleSymbolBack,
                onForward: layoutController.handleSymbolForward,
                onSymbolSelect: layoutController.handleSymbolSelect,
              }}
              onCellChange={layoutController.applyCellUpdate}
              onActiveCellChange={layoutController.handleActiveCellChange}
              onToolbarPrefsChange={layoutController.handleToolbarPrefsChange}
            />
            <FloatingPanelHost
              activePanel={sidebar.activePanel}
              sidebar={bootstrap.layout.sidebar}
              onGeometryChange={sidebar.handleFloatingGeometryChange}
              onDock={sidebar.handlePanelDock}
              onClose={sidebar.handleSidebarClose}
            />
            <RightSidebar
              activePanel={sidebar.activePanel}
              mode="overlay"
              width={sidebar.sidebarPanelWidth}
              viewportWidth={sidebar.responsive.viewportWidth}
              railWidth={sidebar.sidebarRailWidth}
              isFloating={sidebar.isPanelFloating}
              onWidthChange={sidebar.handleSidebarWidthChange}
              onClose={sidebar.handleSidebarClose}
            />
          </div>
        </div>
        <SidebarRail
          theme={bootstrap.layout.theme}
          activePanel={sidebar.activePanel}
          railMode={sidebar.responsive.railMode}
          onTogglePanel={sidebar.handleSidebarToggle}
          onThemeChange={layoutController.handleThemeChange}
        />
      </div>
    </AppProviders>
  );
}

type ChartHeaderBarWithTradeProps = Omit<ComponentProps<typeof ChartHeaderBar>, "onOpenTrade">;

function ChartHeaderBarWithTrade(props: ChartHeaderBarWithTradeProps) {
  const { openTradePanel } = useTradeSetupBinding();
  return <ChartHeaderBar {...props} onOpenTrade={openTradePanel} />;
}
