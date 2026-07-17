"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import AppModuleShell from "@/app/components/home/AppModuleShell";
import ModuleRouteTracker from "@/app/components/home/ModuleRouteTracker";
import { MarketDataProvider } from "@/app/components/MarketDataProvider";
import ScreenerSubNav from "@/app/components/screener/ScreenerSubNav";
import { ScreenerProvider } from "@/app/components/screener/ScreenerProvider";
import { WatchlistProvider } from "@/app/components/watchlist/WatchlistContext";
import { DEFAULT_LAYOUT } from "@/lib/chartConfig";
import { createDefaultScreenerSession } from "@/lib/screener/screenerSession";
import { loadScreenerState } from "@/lib/screener/screenStorage";
import { loadWatchlistState } from "@/lib/watchlist/storage";

type Props = {
  children: ReactNode;
};

export default function ScreenerModuleShell({ children }: Props) {
  const screenerBootstrap = useMemo(() => loadScreenerState(), []);
  const screenerSessionBootstrap = useMemo(
    () => createDefaultScreenerSession(screenerBootstrap),
    [screenerBootstrap],
  );
  const watchlistBootstrap = useMemo(() => loadWatchlistState(), []);

  return (
    <AppModuleShell testId="screener-page">
      <WatchlistProvider initialState={watchlistBootstrap}>
        <ScreenerProvider
          initialState={screenerBootstrap}
          initialSession={screenerSessionBootstrap}
        >
          <MarketDataProvider layout={DEFAULT_LAYOUT}>
            <ModuleRouteTracker module="screener" />
            <div className="flex min-h-0 min-w-0 flex-1">
              <ScreenerSubNav />
              <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
            </div>
          </MarketDataProvider>
        </ScreenerProvider>
      </WatchlistProvider>
    </AppModuleShell>
  );
}
