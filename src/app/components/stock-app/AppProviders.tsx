"use client";

import { useState, type ReactNode } from "react";
import { SidebarProvider } from "../SidebarContext";
import { ChartActionsProvider } from "../ChartActionsContext";
import { AppActionsProvider } from "../AppActionsContext";
import { WatchlistProvider } from "../watchlist/WatchlistContext";
import { ScreenerProvider } from "../screener/ScreenerProvider";
import { ScreenerDriveListener } from "../screener/ScreenerDriveListener";
import { WorkspaceChartDriveBridge } from "../app-workspace/WorkspaceChartDriveBridge";
import { WorkspaceScriptApplyBridge } from "../app-workspace/WorkspaceScriptApplyBridge";
import { MarketDataProvider } from "../MarketDataProvider";
import { RiskSettingsProvider } from "../RiskSettingsProvider";
import { DataHealthProvider } from "../data-health";
import { AiToolsProvider } from "../AiToolsProvider";
import { CopilotProvider } from "../copilot/CopilotContext";
import { PatternLibraryProvider } from "../pattern-library/PatternLibraryContext";
import { ShortcutUIProvider } from "../shortcuts/ShortcutUIContext";
import ShortcutProvider from "../shortcuts/ShortcutProvider";
import ShortcutOverlaysHost from "../shortcuts/CommandPalette";
import { PanelPresentationProvider } from "../sidebar/PanelPresentationContext";
import { SidebarPanelWidthProvider } from "../sidebar/SidebarPanelWidthContext";
import { TradeSetupBindingProvider } from "../trading/TradeSetupBindingContext";
import { RiskPositionBindingProvider } from "../risk/RiskPositionBindingContext";
import { RiskLiquidationOverlayProvider } from "../risk/RiskLiquidationOverlayContext";
import { OptionsSessionProvider } from "../options/OptionsSessionProvider";
import OpenRiskWorkspaceBridge from "../home/OpenRiskWorkspaceBridge";
import OpenRiskShortcutRegistration from "../shortcuts/OpenRiskShortcutRegistration";
import { ModalContainmentProvider } from "../design-system/ModalContainmentContext";
import LocalErrorReporter from "../observability/LocalErrorReporter";
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
 * SidebarProvider → TradeSetupBindingProvider → RiskPositionBindingProvider
 *   → RiskLiquidationOverlayProvider
 *   → ChartActionsProvider
 *   → ScreenerDriveListener / WorkspaceChartDriveBridge
 *   → AppActionsProvider → PatternLibraryProvider
 *   → WatchlistProvider → ScreenerProvider → MarketDataProvider
 *   → RiskSettingsProvider → PanelPresentationProvider → SidebarPanelWidthProvider
 *   → OptionsSessionProvider → DataHealthProvider
 *   → (ActiveChartProvider lives on AppWorkspaceShell so journal tiles share chart context)
 *   → ShortcutUIProvider → ShortcutProvider → AiToolsProvider → chrome
 * Density layout mounts AiSessionBridge once for Talk/Board/Desk — not duplicated here.
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
  addScriptIndicatorToActiveChart?: (params: {
    scriptId: string;
    revision: string;
    name: string;
    pane: "main" | "sub";
  }) => void;
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
  addScriptIndicatorToActiveChart,
  isPrimaryChart = true,
  children,
}: AppProvidersProps) {
  const [modalRoot, setModalRoot] = useState<HTMLDivElement | null>(null);

  return (
    <SidebarProvider
      activePanel={activePanel}
      onActivePanelChange={onSidebarPanelChange}
    >
      <TradeSetupBindingProvider>
        <RiskPositionBindingProvider>
          <RiskLiquidationOverlayProvider>
          <ModalContainmentProvider mode="parent" root={modalRoot}>
            <div className="edge-app-shell edge-app-enter relative flex h-full min-h-0 flex-col overflow-hidden">
              <ChartActionsProvider
                activeCellSymbol={activeCellSymbol}
                loadSymbolIntoActiveChart={onSymbolSelect}
                addScriptIndicatorToActiveChart={addScriptIndicatorToActiveChart}
              >
                <ScreenerDriveListener />
                <WorkspaceChartDriveBridge />
                <WorkspaceScriptApplyBridge />
                <AppActionsProvider value={appActions}>
                  <OpenRiskWorkspaceBridge
                    appActions={appActions}
                    loadSymbolIntoActiveChart={onSymbolSelect}
                  />
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
                                    <OptionsSessionProvider>
                                      <DataHealthProvider>
                                        <ShortcutUIProvider>
                                          <OpenRiskShortcutRegistration />
                                          <ShortcutOverlaysHost />
                                          <ShortcutProvider>
                                            <AiToolsProvider>
                                              <CopilotProvider>
                                                <LocalErrorReporter />
                                                <PrimaryChartBrowserTabQuote
                                                  symbol={activeCellSymbol}
                                                  enabled={isPrimaryChart}
                                                />
                                                {children}
                                              </CopilotProvider>
                                            </AiToolsProvider>
                                          </ShortcutProvider>
                                        </ShortcutUIProvider>
                                      </DataHealthProvider>
                                    </OptionsSessionProvider>
                                </SidebarPanelWidthProvider>
                              </PanelPresentationProvider>
                            </RiskSettingsProvider>
                          </MarketDataProvider>
                        </ScreenerProvider>
                      </WatchlistProvider>
                  </PatternLibraryProvider>
                </AppActionsProvider>
              </ChartActionsProvider>
              <div
                ref={setModalRoot}
                data-testid="chart-modal-root"
                className="pointer-events-none absolute inset-0 z-[100]"
              />
            </div>
          </ModalContainmentProvider>
          </RiskLiquidationOverlayProvider>
        </RiskPositionBindingProvider>
      </TradeSetupBindingProvider>
    </SidebarProvider>
  );
}
