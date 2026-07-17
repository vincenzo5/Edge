"use client";

import type { ReactNode } from "react";
import { SidebarProvider } from "../SidebarContext";
import { ActiveChartProvider } from "../ActiveChartContext";
import { ChartActionsProvider } from "../ChartActionsContext";
import { AppActionsProvider } from "../AppActionsContext";
import { WatchlistProvider } from "../watchlist/WatchlistContext";
import { ScreenerProvider } from "../screener/ScreenerProvider";
import { ScreenerDriveListener } from "../screener/ScreenerDriveListener";
import { WorkspaceChartDriveBridge } from "../app-workspace/WorkspaceChartDriveBridge";
import { MarketDataProvider } from "../MarketDataProvider";
import { RiskSettingsProvider } from "../RiskSettingsProvider";
import { DataHealthProvider } from "../data-health";
import { AiToolsProvider } from "../AiToolsProvider";
import AiSessionBridge from "../AiSessionBridge";
import { PatternLibraryProvider } from "../pattern-library/PatternLibraryContext";
import { ShortcutUIProvider } from "../shortcuts/ShortcutUIContext";
import ShortcutProvider from "../shortcuts/ShortcutProvider";
import { PanelPresentationProvider } from "../sidebar/PanelPresentationContext";
import { SidebarPanelWidthProvider } from "../sidebar/SidebarPanelWidthContext";
import { TradeSetupBindingProvider } from "../trading/TradeSetupBindingContext";
import { OptionsSessionProvider } from "../options/OptionsSessionProvider";
import PrimaryChartBrowserTabQuote from "../chart-chrome/PrimaryChartBrowserTabQuote";
import type { ChartLayout, SidebarPanelId } from "@/lib/chartConfig";
import type { WatchlistState } from "@/lib/watchlist/types";
import type { ScreenerState } from "@/lib/screener/types";
import type { ScreenerSessionState } from "@/lib/screener/screenerSession";
import type { AppActions } from "@/lib/ai/context";
import type { PanelPresentationContextValue } from "../sidebar/PanelPresentationContext";
import type { SidebarPanelWidthContextValue } from "../sidebar/SidebarPanelWidthContext";

/**
 * StockApp provider nest — order is load-bearing; do not reorder casually.
 *
 * SidebarProvider → TradeSetupBindingProvider → ChartActionsProvider
 *   → ScreenerDriveListener / WorkspaceChartDriveBridge
 *   → AppActionsProvider → PatternLibraryProvider
 *   → WatchlistProvider → ScreenerProvider → MarketDataProvider
 *   → RiskSettingsProvider → PanelPresentationProvider → SidebarPanelWidthProvider
 *   → ActiveChartProvider → OptionsSessionProvider → DataHealthProvider
 *   → ShortcutUIProvider → ShortcutProvider → AiToolsProvider → chrome
 */
export type AppProvidersProps = {
  layout: ChartLayout;
  activePanel: SidebarPanelId | null;
  activeCellSymbol: string;
  watchlistBootstrap: WatchlistState | null;
  screenerBootstrap: ScreenerState | null;
  screenerSessionBootstrap: ScreenerSessionState | null;
  appActions: AppActions;
  panelPresentation: PanelPresentationContextValue;
  sidebarPanelWidthContext: SidebarPanelWidthContextValue;
  onSidebarPanelChange: (panel: SidebarPanelId | null) => void;
  onSymbolSelect: (result: { symbol: string; name: string; exchange: string }) => void;
  isPrimaryChart?: boolean;
  children: ReactNode;
};

export function AppProviders({
  layout,
  activePanel,
  activeCellSymbol,
  watchlistBootstrap,
  screenerBootstrap,
  screenerSessionBootstrap,
  appActions,
  panelPresentation,
  sidebarPanelWidthContext,
  onSidebarPanelChange,
  onSymbolSelect,
  isPrimaryChart = true,
  children,
}: AppProvidersProps) {
  return (
    <SidebarProvider
      activePanel={activePanel}
      onActivePanelChange={onSidebarPanelChange}
    >
      <TradeSetupBindingProvider>
        <div className="edge-app-shell edge-app-enter flex h-full min-h-0 flex-col overflow-hidden">
          <ChartActionsProvider
            activeCellSymbol={activeCellSymbol}
            loadSymbolIntoActiveChart={onSymbolSelect}
          >
            <ScreenerDriveListener />
            <WorkspaceChartDriveBridge />
            <AppActionsProvider value={appActions}>
              <PatternLibraryProvider>
                <WatchlistProvider initialState={watchlistBootstrap ?? undefined}>
                  <ScreenerProvider
                    initialState={screenerBootstrap ?? undefined}
                    initialSession={screenerSessionBootstrap ?? undefined}
                  >
                    <MarketDataProvider layout={layout}>
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
                                        <PrimaryChartBrowserTabQuote
                                          symbol={activeCellSymbol}
                                          enabled={isPrimaryChart}
                                        />
                                        {children}
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
              </PatternLibraryProvider>
            </AppActionsProvider>
          </ChartActionsProvider>
        </div>
      </TradeSetupBindingProvider>
    </SidebarProvider>
  );
}
