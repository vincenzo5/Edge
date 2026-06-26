export type AssetClass = "equity" | "etf" | "index" | "option" | "future" | "crypto" | "other";

export type Instrument = {
  symbol: string;
  name: string;
  exchange?: string;
  assetClass?: AssetClass;
  currency?: string;
  country?: string;
  providerIds?: Record<string, string>;
};

export type InstrumentSearchResult = {
  symbol: string;
  name: string;
  exchange?: string;
  assetType?: string;
};
