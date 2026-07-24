import type { EquityQuote } from "../contracts/equities";
import type { MarketEventsQuery } from "../contracts/events";
import type { DataCacheTier, DataResult } from "../contracts/result";
import type { DataProviderPreference } from "@/lib/connections/types";
import type { TrustUsage } from "../providerWaterfall";
import { isMarketDataPerfEnabled } from "../telemetry/isPerfEnabled";
import type { PerfPhaseCollector } from "../telemetry/perfPhases";

export const TWS_GATEWAY_PROBE_TTL_MS = 15_000;
export const IBKR_AUTH_PROBE_TTL_MS = 15_000;
export const TWS_WARMUP_BUDGET_MS = 5_000;

export type MarketDataReadOptions = {
  traceId?: string;
  perf?: PerfPhaseCollector | null;
  twsConnectionId?: string;
  providerPreference?: DataProviderPreference;
  respectProviderPreference?: boolean;
  trustUsage?: TrustUsage;
};

export type QuoteStreamTransport = "tws" | "ibkr" | "poll";

export function hotCacheTier(fresh: boolean): DataCacheTier {
  return fresh ? "hot-fresh" : "hot-stale";
}

export function oldestQuoteUpdatedAt(quotes: EquityQuote[]): number | undefined {
  if (quotes.length === 0) return undefined;
  return Math.min(...quotes.map((quote) => quote.updatedAt));
}

export function recentIsoDate(offsetDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export function attachPerfMeta<T extends DataResult<unknown>>(
  result: T,
  traceId: string | undefined,
  collector: PerfPhaseCollector | null,
): T {
  if (!collector || !isMarketDataPerfEnabled()) return result;
  return {
    ...result,
    traceId,
    phases: [...collector.toArray(), ...(result.phases ?? [])],
  };
}

export function defaultMacroDateWindow(query: MarketEventsQuery): { from: string; to: string } {
  const today = new Date();
  const from = query.from ?? today.toISOString().slice(0, 10);
  if (query.to) {
    return { from, to: query.to };
  }
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() + 90);
  return { from, to: end.toISOString().slice(0, 10) };
}
