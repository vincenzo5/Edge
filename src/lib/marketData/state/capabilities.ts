import type { DataProviderId } from "../contracts/result";

/** Provider capability identifiers — reconciled with Phase 1 provider matrix. */
export type ProviderCapability =
  | "equity_candles"
  | "equity_quotes"
  | "equity_universe_daily"
  | "equity_snapshots"
  | "instrument_search"
  | "fundamentals"
  | "options_chain"
  | "options_expirations"
  | "corporate_events"
  | "news"
  | "macro"
  | "sec_filings"
  | "screener"
  | "market_movers"
  | "brokerage_truth";

export type ProviderLifecycle = "active" | "infrastructure";

export type ProviderCapabilityDefinition = {
  provider: DataProviderId;
  lifecycle: ProviderLifecycle;
  capabilities: readonly ProviderCapability[];
  envGate?: string;
};

/** Authoritative capability matrix from Phase 1 reconciliation. */
export const PROVIDER_CAPABILITY_REGISTRY: readonly ProviderCapabilityDefinition[] = [
  {
    provider: "tws",
    lifecycle: "active",
    capabilities: [
      "equity_candles",
      "equity_quotes",
      "options_chain",
      "options_expirations",
      "brokerage_truth",
    ],
    envGate: "TWS_ENABLED",
  },
  {
    provider: "ibkr",
    lifecycle: "active",
    capabilities: ["equity_candles", "equity_quotes", "options_chain", "options_expirations"],
    envGate: "IBKR_ENABLED",
  },
  {
    provider: "yahoo",
    lifecycle: "active",
    capabilities: ["equity_candles", "equity_quotes", "instrument_search", "fundamentals"],
  },
  {
    provider: "massive",
    lifecycle: "active",
    capabilities: [
      "equity_candles",
      "equity_universe_daily",
      "equity_snapshots",
      "options_chain",
      "options_expirations",
    ],
    envGate: "MASSIVE_API_KEY",
  },
  {
    provider: "fmp",
    lifecycle: "active",
    capabilities: [
      "fundamentals",
      "corporate_events",
      "news",
      "sec_filings",
      "screener",
      "market_movers",
    ],
    envGate: "FMP_API_KEY",
  },
  {
    provider: "fred",
    lifecycle: "active",
    capabilities: ["macro"],
    envGate: "FRED_API_KEY",
  },
  {
    provider: "sec",
    lifecycle: "active",
    capabilities: ["sec_filings"],
    envGate: "SEC_USER_AGENT",
  },
] as const;

export type ProviderCapabilityMap = Record<DataProviderId, ProviderCapability[]>;

/** Compatibility map for existing router consumers. */
export const DEFAULT_PROVIDER_CAPABILITIES: ProviderCapabilityMap =
  Object.fromEntries(
    PROVIDER_CAPABILITY_REGISTRY.map((row) => [row.provider, [...row.capabilities]]),
  ) as ProviderCapabilityMap;

export function getProviderDefinition(
  provider: DataProviderId,
): ProviderCapabilityDefinition | undefined {
  return PROVIDER_CAPABILITY_REGISTRY.find((row) => row.provider === provider);
}

export function providerSupportsCapability(
  provider: DataProviderId,
  capability: ProviderCapability,
  map: ProviderCapabilityMap = DEFAULT_PROVIDER_CAPABILITIES,
): boolean {
  return map[provider]?.includes(capability) ?? false;
}

/** @deprecated Use providerSupportsCapability — kept for router compatibility. */
export function providerSupports(
  provider: DataProviderId,
  capability: ProviderCapability,
  map: ProviderCapabilityMap = DEFAULT_PROVIDER_CAPABILITIES,
): boolean {
  return providerSupportsCapability(provider, capability, map);
}

export function listActiveProviders(): ProviderCapabilityDefinition[] {
  return PROVIDER_CAPABILITY_REGISTRY.filter((row) => row.lifecycle === "active");
}
