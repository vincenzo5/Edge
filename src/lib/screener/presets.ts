import type { ScreenQuery } from "@/lib/marketData/schemas/request";
import type { FmpMarketMoverKind } from "@/lib/marketData/contracts/fmp";

export type ScreenerMoverPreset = {
  id: string;
  label: string;
  kind: "movers";
  moverKind: FmpMarketMoverKind;
  limit?: number;
};

export type ScreenerQueryPreset = {
  id: string;
  label: string;
  kind: "screener";
  query: ScreenQuery;
};

export type ScreenerPreset = ScreenerMoverPreset | ScreenerQueryPreset;

export const SCREENER_PRESETS: ScreenerPreset[] = [
  { id: "gainers", label: "Gainers today", kind: "movers", moverKind: "gainers", limit: 50 },
  { id: "losers", label: "Losers today", kind: "movers", moverKind: "losers", limit: 50 },
  { id: "actives", label: "Most actives", kind: "movers", moverKind: "actives", limit: 50 },
  {
    id: "large-cap-dividend",
    label: "Large-cap dividend payers",
    kind: "screener",
    query: {
      marketCap: { min: 10_000_000_000 },
      dividend: { min: 0.02 },
      limit: 200,
    },
  },
  {
    id: "high-beta-momentum",
    label: "High-beta momentum",
    kind: "screener",
    query: {
      beta: { min: 1.5 },
      price: { min: 5 },
      volume: { min: 1_000_000 },
      limit: 200,
    },
  },
  {
    id: "small-cap-under-5",
    label: "Small-cap under $5",
    kind: "screener",
    query: {
      price: { max: 5 },
      marketCap: { max: 500_000_000 },
      limit: 200,
    },
  },
  {
    id: "rsi-oversold",
    label: "RSI oversold (≤30)",
    kind: "screener",
    query: {
      volume: { min: 500_000 },
      technical: { kind: "rsi", period: 14, max: 30 },
      limit: 200,
    },
  },
  {
    id: "rsi-overbought",
    label: "RSI overbought (≥70)",
    kind: "screener",
    query: {
      volume: { min: 500_000 },
      technical: { kind: "rsi", period: 14, min: 70 },
      limit: 200,
    },
  },
  {
    id: "golden-cross",
    label: "Golden cross (SMA50 > SMA200)",
    kind: "screener",
    query: {
      volume: { min: 500_000 },
      technical: { kind: "goldenCross", fast: 50, slow: 200 },
      limit: 200,
    },
  },
  {
    id: "near-52wk-high",
    label: "Near 52-week high (≤5%)",
    kind: "screener",
    query: {
      volume: { min: 500_000 },
      technical: { kind: "fiftyTwoWeekProximity", withinPct: 0.05 },
      limit: 200,
    },
  },
  {
    id: "macd-bullish",
    label: "MACD bullish (hist > 0)",
    kind: "screener",
    query: {
      volume: { min: 500_000 },
      technical: {
        kind: "indicator",
        indicator: "MACD",
        inputs: { fast: 12, slow: 26, signal: 9 },
        series: "histogram",
        bar: "last",
        op: ">",
        threshold: 0,
      },
      limit: 200,
    },
  },
  {
    id: "boll-pctb-overbought",
    label: "Bollinger %B overbought (>0.8)",
    kind: "screener",
    query: {
      volume: { min: 500_000 },
      technical: {
        kind: "indicator",
        indicator: "BOLL",
        inputs: { period: 20, std: 2 },
        series: "middle",
        bar: "last",
        op: ">",
        threshold: 0.8,
        transform: { kind: "bollPctB" },
      },
      limit: 200,
    },
  },
  {
    id: "rsi-indicator",
    label: "RSI oversold via indicator (≤30)",
    kind: "screener",
    query: {
      volume: { min: 500_000 },
      technical: {
        kind: "indicator",
        indicator: "RSI",
        inputs: { period: 14 },
        series: "rsi",
        bar: "last",
        op: "<=",
        threshold: 30,
      },
      limit: 200,
    },
  },
];
