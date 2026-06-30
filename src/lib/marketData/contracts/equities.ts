import type { Interval, Range } from "@/lib/chart/contracts";
import type { MarketSessionMode } from "@edge/chart-core";

/** Chart-boundary candle: Unix epoch milliseconds (UTC). */
export type EquityCandle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number;
};

export type CandleRequest = {
  symbol: string;
  range?: Range;
  interval: Interval;
  beforeTimestamp?: number;
  barCount?: number;
  sessionMode?: MarketSessionMode;
};

export type CandleResponse = {
  symbol: string;
  interval: Interval;
  candles: EquityCandle[];
  hasMore?: boolean;
  nextBeforeTimestamp?: number;
};

export type EquityQuote = {
  symbol: string;
  shortName?: string;
  exchange?: string;
  currency?: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  volume: number | null;
  marketState?: string;
  updatedAt: number;
};
