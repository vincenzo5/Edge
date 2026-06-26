import type { InstrumentSearchResult } from "../contracts/instruments";
import type { CandleRequest, CandleResponse, EquityQuote } from "../contracts/equities";
import type { FundamentalsSnapshot, SecCompanyFacts, SecFiling } from "../contracts/fundamentals";
import type {
  OptionExpiration,
  OptionsChainRequest,
  OptionsChainResponse,
} from "../contracts/options";
import type { CorporateEvent } from "../contracts/events";
import type { NewsItem } from "../contracts/news";
import type { MacroSeries, EconomicRelease } from "../contracts/macro";

export type InstrumentDirectoryPort = {
  searchInstruments(query: string, limit?: number): Promise<InstrumentSearchResult[]>;
};

export type EquityMarketDataPort = {
  getCandles(request: CandleRequest): Promise<CandleResponse>;
  getQuotes(symbols: string[]): Promise<EquityQuote[]>;
};

export type FundamentalsPort = {
  getFundamentals(symbol: string): Promise<FundamentalsSnapshot>;
};

export type SecFundamentalsPort = {
  getCompanyFacts(symbol: string): Promise<SecCompanyFacts | null>;
  getRecentFilings(symbol: string, limit?: number): Promise<SecFiling[]>;
};

export type OptionsMarketDataPort = {
  getExpirations(underlying: string): Promise<OptionExpiration[]>;
  getChain(request: OptionsChainRequest): Promise<OptionsChainResponse>;
  isConfigured(): boolean;
};

export type EventsPort = {
  getCorporateEvents(args: {
    symbol?: string;
    from?: string;
    to?: string;
  }): Promise<CorporateEvent[]>;
  isConfigured(): boolean;
};

export type NewsPort = {
  getNews(args: { symbol?: string; limit?: number }): Promise<NewsItem[]>;
  isConfigured(): boolean;
};

export type MacroPort = {
  getSeries(seriesId: string, limit?: number): Promise<MacroSeries | null>;
  getReleases(limit?: number): Promise<EconomicRelease[]>;
  isConfigured(): boolean;
};
