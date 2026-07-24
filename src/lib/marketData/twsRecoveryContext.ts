import type { TwsRecoveryClientRequest } from "./twsRecoveryClient";

type RecoveryContext = {
  symbols: string[];
  candleRequests: Array<{ symbol: string; interval: string; range?: string }>;
  optionsSymbol?: string;
};

let recoveryContext: RecoveryContext = {
  symbols: [],
  candleRequests: [],
};

/** Latest market-data recovery warmup context — owned by MarketDataProvider / DataHealth. */
export function setTwsRecoveryContext(partial: Partial<RecoveryContext>): void {
  recoveryContext = {
    ...recoveryContext,
    ...partial,
    symbols: partial.symbols ?? recoveryContext.symbols,
    candleRequests: partial.candleRequests ?? recoveryContext.candleRequests,
  };
}

export function getTwsRecoveryContext(): RecoveryContext {
  return {
    symbols: [...recoveryContext.symbols],
    candleRequests: [...recoveryContext.candleRequests],
    optionsSymbol: recoveryContext.optionsSymbol,
  };
}

export function resetTwsRecoveryContextForTests(): void {
  recoveryContext = { symbols: [], candleRequests: [] };
}

/** Merge caller request with the latest stored warmup context. */
export function mergeTwsRecoveryRequest(
  request: TwsRecoveryClientRequest = {},
): TwsRecoveryClientRequest {
  const stored = getTwsRecoveryContext();
  return {
    source: request.source,
    symbols:
      request.symbols && request.symbols.length > 0
        ? request.symbols
        : stored.symbols,
    candleRequests:
      request.candleRequests && request.candleRequests.length > 0
        ? request.candleRequests
        : stored.candleRequests,
    optionsSymbol: request.optionsSymbol ?? stored.optionsSymbol,
  };
}
