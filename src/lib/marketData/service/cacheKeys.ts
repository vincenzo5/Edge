import type { CandleRequest } from "../contracts/equities";
import type { OptionsChainRequest } from "../contracts/options";
import { buildCacheKey } from "../cache";

export function candlesCacheKey(
  provider: string,
  request: CandleRequest,
  connectionId?: string,
): string {
  return buildCacheKey([
    "candles",
    provider,
    connectionId ?? "",
    request.symbol,
    request.range ?? "",
    request.interval,
    request.beforeTimestamp ?? "",
    request.barCount ?? "",
    request.sessionMode ?? "regular",
  ]);
}


export function quotesCacheKey(provider: string, symbols: string[], connectionId?: string): string {
  const canonical = [...symbols].sort().join(",");
  return buildCacheKey(["quotes", provider, connectionId ?? "", canonical]);
}


export function optionExpirationsCacheKey(provider: string, underlying: string): string {
  return buildCacheKey(["options-exp", provider, underlying]);
}


export function optionsChainCacheKey(
  provider: string,
  underlying: string,
  expiration: string,
  strikeWindow?: OptionsChainRequest["strikeWindow"],
): string {
  const windowKey =
    !strikeWindow || strikeWindow.mode === "full"
      ? "full"
      : `atm:${strikeWindow.count ?? 20}:${strikeWindow.spot ?? "auto"}`;
  return buildCacheKey(["options-chain", provider, underlying, expiration, windowKey]);
}

