export type WatchlistItem = {
  symbol: string;
  name?: string;
  exchange?: string;
  addedAt: number;
  color?: string;
  pinned?: boolean;
  tags?: string[];
  note?: string;
};

export type WatchlistColumnId =
  | "symbol"
  | "last"
  | "changePct"
  | "volume"
  | "marketCap";

export type WatchlistGroupMode = "none" | "tags" | "sector";

export type WatchlistSortDirection = "asc" | "desc";

export type WatchlistSortSpec = {
  column: WatchlistColumnId;
  direction: WatchlistSortDirection;
};

export type WatchlistViewPrefs = {
  visibleColumns: WatchlistColumnId[];
  sort: WatchlistSortSpec;
  groupMode: WatchlistGroupMode;
  filterTags: string[];
};

export type Watchlist = {
  id: string;
  name: string;
  items: WatchlistItem[];
  createdAt: number;
  updatedAt: number;
  viewPrefs?: WatchlistViewPrefs;
};

export type WatchlistState = {
  version: 1;
  activeWatchlistId: string;
  selectedSymbol: string | null;
  watchlists: Watchlist[];
};

export type QuoteSnapshot = {
  symbol: string;
  shortName?: string;
  exchange?: string;
  currency?: string;
  regularMarketPrice: number | null;
  regularMarketChange: number | null;
  regularMarketChangePercent: number | null;
  regularMarketVolume: number | null;
  marketState?: string;
  updatedAt: number;
};

export type FundamentalsSnapshot = {
  symbol: string;
  shortName: string | null;
  longName: string | null;
  exchange: string | null;
  currency: string | null;
  regularMarketPrice: number | null;
  regularMarketChange: number | null;
  regularMarketChangePercent: number | null;
  marketCap: number | null;
  volume: number | null;
  averageVolume: number | null;
  sector: string | null;
  industry: string | null;
  website: string | null;
  description: string | null;
  updatedAt: number;
};

export type SymbolSelectResult = {
  symbol: string;
  name: string;
  exchange: string;
};

export const DEFAULT_WATCHLIST_VIEW_PREFS: WatchlistViewPrefs = {
  visibleColumns: ["symbol", "last", "changePct"],
  sort: { column: "symbol", direction: "asc" },
  groupMode: "none",
  filterTags: [],
};

export const WATCHLIST_COLUMN_LABELS: Record<WatchlistColumnId, string> = {
  symbol: "Symbol",
  last: "Last",
  changePct: "Chg%",
  volume: "Volume",
  marketCap: "Mkt cap",
};
