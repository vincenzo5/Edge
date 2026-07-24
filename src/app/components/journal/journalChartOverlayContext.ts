"use client";

import { createContext, useContext } from "react";
import type { ChartAnnotationChannelMarker } from "@edge/chart-core";

export type JournalChartOverlayState = {
  tradeId: string | null;
  tradeSymbol: string | null;
  gotoMs: number | null;
  markers: ChartAnnotationChannelMarker[];
  loading: boolean;
  consumeGoto: () => number | null;
};

export const JournalChartOverlayContext = createContext<JournalChartOverlayState>({
  tradeId: null,
  tradeSymbol: null,
  gotoMs: null,
  markers: [],
  loading: false,
  consumeGoto: () => null,
});

export function useJournalChartOverlay(symbol: string): {
  markers: ChartAnnotationChannelMarker[];
  gotoMs: number | null;
  consumeGoto: () => number | null;
} {
  const ctx = useContext(JournalChartOverlayContext);
  const normalized = symbol.toUpperCase();
  const active =
    ctx.tradeSymbol != null && ctx.tradeSymbol.toUpperCase() === normalized;
  return {
    markers: active ? ctx.markers : [],
    gotoMs: active ? ctx.gotoMs : null,
    consumeGoto: ctx.consumeGoto,
  };
}
