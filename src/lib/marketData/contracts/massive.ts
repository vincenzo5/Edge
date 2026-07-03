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

export type MassiveOptionReferenceContract = {
  ticker?: string;
  underlying_ticker?: string;
  contract_type?: string;
  expiration_date?: string;
  strike_price?: number;
  exercise_style?: string;
  shares_per_contract?: number;
  primary_exchange?: string;
};

export type MassiveOptionReferenceContractsResponse = {
  status?: string;
  request_id?: string;
  next_url?: string;
  results?: MassiveOptionReferenceContract[];
};

export type MassiveOptionQuote = {
  bid?: number;
  ask?: number;
  midpoint?: number;
  last_updated?: number;
  timeframe?: string;
};

export type MassiveOptionTrade = {
  price?: number;
  sip_timestamp?: number;
  timeframe?: string;
};

export type MassiveOptionDayBar = {
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
  last_updated?: number;
};

export type MassiveOptionGreeks = {
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
};

export type MassiveOptionChainDetails = {
  ticker?: string;
  contract_type?: string;
  expiration_date?: string;
  strike_price?: number;
  exercise_style?: string;
  shares_per_contract?: number;
};

export type MassiveOptionChainSnapshot = {
  ticker?: string;
  break_even_price?: number;
  fmv?: number;
  fmv_last_updated?: number;
  implied_volatility?: number;
  open_interest?: number;
  details?: MassiveOptionChainDetails;
  last_quote?: MassiveOptionQuote;
  last_trade?: MassiveOptionTrade;
  day?: MassiveOptionDayBar;
  greeks?: MassiveOptionGreeks;
  underlying_asset?: {
    price?: number;
    ticker?: string;
    last_updated?: number;
    timeframe?: string;
  };
};

export type MassiveOptionChainSnapshotResponse = {
  status?: string;
  request_id?: string;
  next_url?: string;
  results?: MassiveOptionChainSnapshot[];
};
