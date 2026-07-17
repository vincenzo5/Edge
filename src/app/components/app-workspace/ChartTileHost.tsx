"use client";

import { Suspense } from "react";

import StockApp from "@/app/components/StockApp";
import { JournalChartOverlayProvider } from "@/app/components/journal/JournalChartOverlayProvider";

type Props = {
  isPrimaryChart?: boolean;
};

export default function ChartTileHost({ isPrimaryChart = false }: Props) {
  return (
    <div data-testid="chart-tile-host" className="h-full min-h-0 overflow-hidden">
      <JournalChartOverlayProvider>
        <StockApp isPrimaryChart={isPrimaryChart} />
      </JournalChartOverlayProvider>
    </div>
  );
}
