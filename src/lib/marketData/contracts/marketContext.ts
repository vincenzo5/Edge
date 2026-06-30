import type { AssetClass } from "./instruments";

export type MarketContextSource = "tws" | "ibkr" | "fmp" | "yahoo" | "curated";

export type MarketContextConfidence = "provider" | "curated" | "fallback";

export type MarketContextRelationshipKind =
  | "company"
  | "sector"
  | "industry"
  | "exchange"
  | "sector_etf"
  | "industry_etf"
  | "broad_index"
  | "index_member";

export type MarketContextRelationship = {
  kind: MarketContextRelationshipKind;
  label: string;
  /** Tradable symbol when the relationship is navigable. */
  symbol?: string;
  source: MarketContextSource;
  confidence: MarketContextConfidence;
  reason?: string;
  /** Nested members for grouped crumbs (e.g. index membership popover). */
  members?: MarketContextRelationship[];
};

export type MarketContextClassification = {
  label: string;
  source: MarketContextSource;
  confidence: MarketContextConfidence;
};

export type TradableFlavor =
  | "sector_etf"
  | "industry_etf"
  | "broad_market"
  | "benchmark"
  | "sector_index"
  | "style"
  | "strategy";

export type MarketContextTradable = {
  flavor: TradableFlavor;
  label: string;
  symbol: string;
  indexLabel?: string;
  source: MarketContextSource;
  confidence: MarketContextConfidence;
  reason?: string;
};

export type TradableGroup = {
  flavor: TradableFlavor;
  label: string;
  members: MarketContextTradable[];
};

export type MarketContext = {
  symbol: string;
  name: string | null;
  assetClass: AssetClass;
  exchange: string | null;
  sector: MarketContextClassification | null;
  industry: MarketContextClassification | null;
  /** @deprecated Prefer tradableGroups for navigation; classification-only breadcrumb chain. */
  relationships: MarketContextRelationship[];
  /** Tradable wrappers grouped by membership flavor — canonical source for Related popover. */
  tradableGroups: TradableGroup[];
  updatedAt: number;
};

export type TwsContractDetails = {
  symbol: string;
  conid: number;
  secType: string | null;
  exchange: string | null;
  primaryExchange: string | null;
  companyName: string | null;
  industry: string | null;
  category: string | null;
  subcategory: string | null;
};

export type IbkrContractClassification = {
  symbol: string;
  conid: number;
  exchange: string | null;
  companyName: string | null;
  industry: string | null;
  category: string | null;
  subcategory: string | null;
};
