"use client";

import { useEffect } from "react";
import { useChartActions } from "../ChartActionsContext";
import {
  publishReviewChartReady,
  subscribeReviewChannel,
} from "@/lib/screener/reviewChannel";

export function ScreenerDriveListener() {
  const chartActions = useChartActions();

  useEffect(() => {
    publishReviewChartReady();

    return subscribeReviewChannel((message) => {
      if (message.type !== "setSymbol") return;

      chartActions?.loadSymbolIntoActiveChart({
        symbol: message.symbol,
        name: message.name ?? message.symbol,
        exchange: message.exchange ?? "",
      });
    });
  }, [chartActions]);

  return null;
}
