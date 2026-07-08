import { Suspense } from "react";

import StockApp from "../components/StockApp";
import AppModuleShell from "../components/home/AppModuleShell";
import ModuleRouteTracker from "../components/home/ModuleRouteTracker";
import { JournalChartOverlayProvider } from "../components/journal/JournalChartOverlayProvider";

export default function ChartPage() {
  return (
    <Suspense fallback={null}>
      <AppModuleShell testId="chart-page">
        <ModuleRouteTracker module="chart" />
        <div className="min-h-0 flex-1 overflow-hidden">
          <JournalChartOverlayProvider>
            <StockApp />
          </JournalChartOverlayProvider>
        </div>
      </AppModuleShell>
    </Suspense>
  );
}
