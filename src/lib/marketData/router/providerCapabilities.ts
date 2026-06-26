import type { DataProviderId } from "../contracts/result";

export type ProviderCapability =
  | "equity_candles"
  | "equity_quotes"
  | "instrument_search"
  | "fundamentals"
  | "options_chain"
  | "corporate_events"
  | "news"
  | "macro"
  | "sec_filings";

export type ProviderCapabilityMap = Record<DataProviderId, ProviderCapability[]>;

export const DEFAULT_PROVIDER_CAPABILITIES: ProviderCapabilityMap = {
  yahoo: ["equity_candles", "equity_quotes", "instrument_search", "fundamentals"],
  sec: ["sec_filings"],
  fred: ["macro"],
  fmp: ["corporate_events", "news", "fundamentals", "sec_filings"],
  alphaVantage: [],
  tradier: ["options_chain"],
  alpaca: [],
  ibkr: ["equity_candles", "equity_quotes", "options_chain"],
};

export function providerSupports(
  provider: DataProviderId,
  capability: ProviderCapability,
  map: ProviderCapabilityMap = DEFAULT_PROVIDER_CAPABILITIES,
): boolean {
  return map[provider]?.includes(capability) ?? false;
}
