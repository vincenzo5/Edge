"use client";

import { useMemo, useState } from "react";

import { ActiveChartProvider } from "@/app/components/ActiveChartContext";
import { AppTimeZoneProvider } from "@/app/components/AppTimeZoneProvider";
import ChartCell from "@/app/components/ChartCell";
import InactiveChartSurface from "@/app/components/chart-cell/InactiveChartSurface";
import { ChartSyncProvider } from "@/app/components/ChartSyncContext";
import { MarketDataProvider } from "@/app/components/MarketDataProvider";
import { buildBoardChartCellConfig } from "@/lib/research/buildBoardChartCellConfig";
import type { ResearchCardSketch } from "@/lib/research/sessionSketch";
import { DEFAULT_LAYOUT, DEFAULT_TOOLBAR_PREFS, type CellConfig, type ChartLayout } from "@/lib/chartConfig";

type ChartResearchCardSketch = Extract<ResearchCardSketch, { type: "chart" }>;

type Props = {
  card: ChartResearchCardSketch;
  chartId: string;
  mountLive: boolean;
  theme?: "light" | "dark";
};

function BoardChartCardHostInner({ card, chartId, mountLive, theme = "dark" }: Props) {
  const [config, setConfig] = useState<CellConfig>(() => buildBoardChartCellConfig(card));

  const layout = useMemo((): ChartLayout => {
    return {
      ...DEFAULT_LAYOUT,
      theme,
      cells: [config],
    };
  }, [config, theme]);

  if (!mountLive) {
    return <InactiveChartSurface symbol={card.symbol} />;
  }

  return (
    <MarketDataProvider layout={layout}>
      <div className="relative h-full min-h-[140px] w-full overflow-hidden rounded-b bg-[var(--edge-surface-chart)]">
        <ChartCell
          chartId={chartId}
          config={config}
          theme={theme}
          compact
          isActive
          showDrawingRail={false}
          toolbarPrefs={DEFAULT_TOOLBAR_PREFS}
          onConfigChange={setConfig}
          onToolbarPrefsChange={() => {}}
        />
      </div>
    </MarketDataProvider>
  );
}

export default function BoardChartCardHost(props: Props) {
  return (
    <AppTimeZoneProvider>
      <ChartSyncProvider linkCrosshair={false} linkDrawings={false}>
        <ActiveChartProvider>
          <BoardChartCardHostInner {...props} />
        </ActiveChartProvider>
      </ChartSyncProvider>
    </AppTimeZoneProvider>
  );
}
