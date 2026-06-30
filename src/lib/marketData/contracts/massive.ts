/** Normalized Massive (formerly Polygon.io) aggregate shapes. */

export type MassiveGroupedBar = {
  /** Ticker symbol (grouped daily) or bar open time ms (custom bars). */
  T?: string;
  t?: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number;
  vw?: number;
};

export type MassiveGroupedDailyResponse = {
  status?: string;
  resultsCount?: number;
  results?: MassiveGroupedBar[];
};

export type MassiveAggregatesResponse = {
  status?: string;
  ticker?: string;
  resultsCount?: number;
  results?: MassiveGroupedBar[];
};

export type MassiveSnapshotTicker = {
  ticker?: string;
  todaysChange?: number;
  todaysChangePerc?: number;
  day?: {
    o?: number;
    h?: number;
    l?: number;
    c?: number;
    v?: number;
    vw?: number;
  };
  prevDay?: {
    c?: number;
  };
  lastTrade?: { p?: number; t?: number };
  lastQuote?: { p?: number; t?: number };
  updated?: number;
};

export type MassiveSnapshotAllResponse = {
  status?: string;
  count?: number;
  tickers?: MassiveSnapshotTicker[];
};
