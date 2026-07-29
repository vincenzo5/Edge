import type { CandleRequest, CandleResponse, EquityQuote } from "../contracts/equities";
import { createDataResult, type DataResult } from "../contracts/result";
import { globalDataCache } from "../cache/serverCacheBackends";
import type { IbkrContractProbe, IbkrProvider, IbkrStatusProbe } from "../providers/ibkr/adapter";
import type { TwsContractProbe, TwsProvider } from "../providers/tws/adapter";
import type { TwsStatusProbe } from "../providers/tws/client";
import { isStaleTwsSidecarHealth } from "../providers/tws/client";
import { ibkrHealthGate } from "../providers/ibkr/healthGate";
import { twsHealthGate } from "../providers/tws/healthGate";
import { invalidateHotRecoveryKeys } from "../hotStore";
import type { WarmupPhaseReport, WarmupReport } from "../telemetry/types";
import { candlesCacheKey, quotesCacheKey } from "./cacheKeys";
import { getOptionExpirations } from "./optionsFetch";
import { getCandles } from "./candlesFetch";
import { getMarketContext } from "./contextAndFundamentals";
import {
  ensureTwsGatewayProbe,
  lastKnownTwsStatus,
  recordTwsFailure,
  storeTwsObservedStatus,
  twsRoutingDecision,
} from "./providerRouting";
import {
  TWS_WARMUP_BUDGET_MS,
  type MarketDataReadOptions,
  type QuoteStreamTransport,
} from "./marketDataServiceShared";
import type { MarketDataServiceHost } from "./marketDataServiceHost";

export async function getIbkrStatusProbe(svc: MarketDataServiceHost): Promise<DataResult<IbkrStatusProbe>> {
  const requestedAt = Date.now();
  if (!svc.ibkr.isConfigured()) {
    return createDataResult(
      {
        configured: false,
        gatewayReachable: false,
        authenticated: false,
        connected: false,
        competing: false,
        warnings: ["IBKR_ENABLED is not true"],
      },
      "ibkr",
      { requestedAt, warnings: ["IBKR_ENABLED is not true"] },
    );
  }
  try {
    const data = await svc.ibkr.getStatusProbe();
    return createDataResult(data, "ibkr", {
      requestedAt,
      warnings: data.warnings,
    });
  } catch (error) {
    return createDataResult(
      {
        configured: true,
        gatewayReachable: false,
        authenticated: false,
        connected: false,
        competing: false,
        warnings: [error instanceof Error ? error.message : "IBKR status probe failed"],
      },
      "ibkr",
      {
        requestedAt,
        warnings: [error instanceof Error ? error.message : "IBKR status probe failed"],
      },
    );
  }
}


export async function getIbkrContractProbe(svc: MarketDataServiceHost, symbol: string): Promise<DataResult<IbkrContractProbe | null>> {
  const requestedAt = Date.now();
  if (!svc.ibkr.isConfigured()) {
    return createDataResult(null, "ibkr", {
      requestedAt,
      warnings: ["IBKR_ENABLED is not true"],
    });
  }
  const data = await svc.ibkr.resolveContract(symbol);
  return createDataResult(data, "ibkr", { requestedAt });
}


export async function getIbkrQuoteProbe(svc: MarketDataServiceHost, symbol: string): Promise<DataResult<EquityQuote | null>> {
  const requestedAt = Date.now();
  if (!svc.ibkr.isConfigured()) {
    return createDataResult(null, "ibkr", {
      requestedAt,
      warnings: ["IBKR_ENABLED is not true"],
    });
  }
  const data = await svc.ibkr.getQuote(symbol);
  return createDataResult(data, "ibkr", { requestedAt });
}


export async function getIbkrCandlesProbe(svc: MarketDataServiceHost, args: {
  symbol: string;
  interval: CandleRequest["interval"];
  range: NonNullable<CandleRequest["range"]>;
}): Promise<DataResult<CandleResponse | null>> {
  const requestedAt = Date.now();
  if (!svc.ibkr.isConfigured()) {
    return createDataResult(null, "ibkr", {
      requestedAt,
      warnings: ["IBKR_ENABLED is not true"],
    });
  }
  const data = await svc.ibkr.getCandlesForRange(args.symbol, args.interval, args.range);
  return createDataResult(data, "ibkr", { requestedAt });
}


export async function getTwsStatusProbe(svc: MarketDataServiceHost, options: { bypassCircuit?: boolean } = {}): Promise<DataResult<TwsStatusProbe>> {
  const requestedAt = Date.now();
  if (!svc.tws.isConfigured()) {
    return createDataResult(
      {
        configured: false,
        sidecarReachable: false,
        gatewayConnected: false,
        warnings: ["TWS_ENABLED is not true"],
      },
      "tws",
      { requestedAt, warnings: ["TWS_ENABLED is not true"] },
    );
  }
  const bypassCircuit = options.bypassCircuit === true;
  if (!bypassCircuit && !twsHealthGate.shouldTryTws("status")) {
    const gate = twsHealthGate.snapshot();
    const lastFailure = gate.lastFailure ?? "provider_error";
    const sidecarReachable = lastFailure !== "sidecar_unreachable";
    const skipReason = twsHealthGate.getSkipReason() ?? "TWS circuit open";
    return createDataResult(
      lastKnownTwsStatus(svc, 
        {
          sidecarReachable,
          circuitBypassed: true,
        },
        [skipReason],
      ),
      "tws",
      { requestedAt, warnings: [skipReason] },
    );
  }
  const status = await svc.tws.probeStatus?.(2_000);
  if (!status?.sidecarReachable) {
    return createDataResult(
      storeTwsObservedStatus(svc, {
        configured: true,
        sidecarReachable: false,
        gatewayConnected: false,
        warnings: ["Sidecar unreachable"],
      }),
      "tws",
      { requestedAt, warnings: ["Sidecar unreachable"] },
    );
  }
  return createDataResult(storeTwsObservedStatus(svc, status), "tws", {
    requestedAt,
    warnings: status.warnings,
  });
}


export async function getTwsContractProbe(svc: MarketDataServiceHost, symbol: string): Promise<DataResult<TwsContractProbe | null>> {
  const requestedAt = Date.now();
  if (!svc.tws.isConfigured()) {
    return createDataResult(null, "tws", {
      requestedAt,
      warnings: ["TWS_ENABLED is not true"],
    });
  }
  const data = await svc.tws.resolveContract(symbol);
  return createDataResult(data, "tws", { requestedAt });
}


export async function getTwsQuoteProbe(svc: MarketDataServiceHost, symbol: string): Promise<DataResult<EquityQuote | null>> {
  const requestedAt = Date.now();
  if (!svc.tws.isConfigured()) {
    return createDataResult(null, "tws", {
      requestedAt,
      warnings: ["TWS_ENABLED is not true"],
    });
  }
  const data = await svc.tws.getQuote(symbol);
  return createDataResult(data, "tws", { requestedAt });
}


export async function getTwsCandlesProbe(svc: MarketDataServiceHost, args: {
  symbol: string;
  interval: CandleRequest["interval"];
  range: NonNullable<CandleRequest["range"]>;
}): Promise<DataResult<CandleResponse | null>> {
  const requestedAt = Date.now();
  if (!svc.tws.isConfigured()) {
    return createDataResult(null, "tws", {
      requestedAt,
      warnings: ["TWS_ENABLED is not true"],
    });
  }
  const data = await svc.tws.getCandlesForRange(args.symbol, args.interval, args.range);
  return createDataResult(data, "tws", { requestedAt });
}


export async function resolveQuoteStreamTransport(svc: MarketDataServiceHost, ): Promise<QuoteStreamTransport> {
  if (svc.tws.isConfigured() && (await shouldUseTwsQuoteStream(svc, ))) {
    return "tws";
  }
  if (svc.ibkr.isConfigured()) {
    return "ibkr";
  }
  return "poll";
}


export async function shouldUseTwsQuoteStream(svc: MarketDataServiceHost, ): Promise<boolean> {
  await ensureTwsGatewayProbe(svc, );
  const decision = twsRoutingDecision(svc, "quotes");
  if (!decision.shouldTry) {
    return false;
  }
  const status = await svc.tws.probeStatus?.(2_000);
  if (!status?.sidecarReachable) {
    twsHealthGate.recordFailure("sidecar_unreachable");
    return false;
  }
  if (status.restartRequired || status.diagnostics?.workerWedged) {
    twsHealthGate.recordFailure("provider_error");
    return false;
  }
  const client = svc.tws.getClient?.();
  if (client && "probeHealth" in client && typeof client.probeHealth === "function") {
    const health = await client.probeHealth(2_000);
    if (isStaleTwsSidecarHealth(health)) {
      twsHealthGate.recordFailure("provider_error");
      return false;
    }
  }
  return true;
}

/** Clear TWS skip state and stale Yahoo hot/cache entries after sidecar reconnect. */

export function resetTwsRecoveryState(svc: MarketDataServiceHost, args: {
  symbols?: string[];
  candleRequests?: CandleRequest[];
} = {}): void {
  twsHealthGate.reset();
  svc.twsGatewayProbeAt = 0;
  svc.twsGatewayConnected = true;
  svc.lastTwsStatusProbe = null;
  svc.lastTwsStatusObservedAt = 0;
  svc.candlesRevalidateKeys.clear();
  svc.quotesRevalidateKeys.clear();
  svc.optionExpRevalidateKeys.clear();
  svc.optionsChainRevalidateKeys.clear();

  const symbols = [
    ...new Set((args.symbols ?? []).map((s) => s.trim().toUpperCase()).filter(Boolean)),
  ];
  const candleRequests = args.candleRequests ?? [];

  invalidateHotRecoveryKeys({ symbols, candleRequests });

  if (symbols.length > 0) {
    globalDataCache.delete("quotes", quotesCacheKey("yahoo", symbols));
    globalDataCache.delete("quotes", quotesCacheKey("tws", symbols));
    globalDataCache.delete("quotes", quotesCacheKey("ibkr", symbols));
  }
  for (const request of candleRequests) {
    globalDataCache.delete("candles", candlesCacheKey("yahoo", request));
    globalDataCache.delete("candles", candlesCacheKey("tws", request));
    globalDataCache.delete("candles", candlesCacheKey("ibkr", request));
  }
}

/** Best-effort warmup for watchlist/chart/options symbols. Quotes are client-owned. */

export async function primeMarketData(svc: MarketDataServiceHost, args: {
  symbols?: string[];
  candleRequests?: CandleRequest[];
  optionsSymbol?: string;
  activeCellIndex?: number;
  traceId?: string;
}): Promise<WarmupReport> {
  const startedAt = Date.now();
  const phases: WarmupPhaseReport[] = [];
  const traceId = args.traceId;
  const readOptions: MarketDataReadOptions = traceId ? { traceId } : {};
  const symbols = [
    ...new Set((args.symbols ?? []).map((s) => s.trim().toUpperCase()).filter(Boolean)),
  ];

  await ensureTwsGatewayProbe(svc, );
  const twsDecision = twsRoutingDecision(svc, "quotes");

  if (symbols.length > 0 && svc.tws.isConfigured() && twsDecision.shouldTry) {
    const phaseStart = Date.now();
    try {
      await Promise.race([
        svc.tws.warmup?.(symbols) ?? Promise.resolve(),
        new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error(`TWS warmup timed out after ${TWS_WARMUP_BUDGET_MS}ms`)),
            TWS_WARMUP_BUDGET_MS,
          );
        }),
      ]);
      phases.push({
        name: "tws.warmup",
        ms: Date.now() - phaseStart,
        ok: true,
        key: symbols.join(","),
      });
    } catch (error) {
      recordTwsFailure(svc, error);
      phases.push({
        name: "tws.warmup",
        ms: Date.now() - phaseStart,
        ok: false,
        key: symbols.join(","),
        error: error instanceof Error ? error.message : String(error),
      });
    }
  } else if (symbols.length > 0 && svc.tws.isConfigured() && !twsDecision.shouldTry) {
    phases.push({
      name: "tws.warmup",
      ms: 0,
      ok: false,
      key: symbols.join(","),
      error: twsDecision.warning ?? "TWS warmup skipped",
    });
  }

  const runCandleTask = async (request: CandleRequest) => {
    const phaseStart = Date.now();
    const key = `${request.symbol}|${request.interval}|${request.range ?? "1y"}`;
    try {
      const result = await getCandles(svc, request, readOptions);
      phases.push({
        name: "candles",
        key,
        ms: Date.now() - phaseStart,
        ok: true,
        source: result.source,
        cacheTier: result.cacheTier,
      });
    } catch (error) {
      phases.push({
        name: "candles",
        key,
        ms: Date.now() - phaseStart,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const candleRequests = args.candleRequests ?? [];
  const activeIndex = args.activeCellIndex ?? 0;
  const primaryRequest =
    activeIndex >= 0 && activeIndex < candleRequests.length
      ? candleRequests[activeIndex]
      : candleRequests[0];
  const secondaryRequests = candleRequests.filter((_, index) => index !== activeIndex);

  if (primaryRequest) {
    await runCandleTask(primaryRequest);
  }

  const contextSymbol = (
    args.optionsSymbol?.trim().toUpperCase() ?? primaryRequest?.symbol?.trim().toUpperCase()
  );
  if (contextSymbol) {
    const phaseStart = Date.now();
    try {
      const ctxResult = await getMarketContext(svc, contextSymbol);
      phases.push({
        name: "market_context",
        key: contextSymbol,
        ms: Date.now() - phaseStart,
        ok: true,
        source: ctxResult.source,
        cacheTier: ctxResult.cacheTier,
      });
    } catch (error) {
      phases.push({
        name: "market_context",
        key: contextSymbol,
        ms: Date.now() - phaseStart,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (secondaryRequests.length > 0) {
    await Promise.all(secondaryRequests.map((request) => runCandleTask(request)));
  }

  const optionsSymbol = args.optionsSymbol?.trim().toUpperCase();
  if (optionsSymbol) {
    const canTryMassiveOptions = svc.massive.isConfigured();
    const canTryTwsOptions =
      !canTryMassiveOptions &&
      svc.tws.isConfigured() &&
      twsHealthGate.shouldTryTws("options");
    const canTryIbkrOptions =
      !canTryMassiveOptions &&
      svc.ibkr.isConfigured() &&
      ibkrHealthGate.shouldTryIbkr("options");
    if (!canTryMassiveOptions && !canTryTwsOptions && !canTryIbkrOptions) {
      phases.push({
        name: "options.expirations",
        key: optionsSymbol,
        ms: 0,
        ok: false,
        error: "Options warmup deferred — Massive/TWS/IBKR unavailable",
      });
    } else {
      const phaseStart = Date.now();
      try {
        const expResult = await getOptionExpirations(svc, optionsSymbol);
        phases.push({
          name: "options.expirations",
          key: optionsSymbol,
          ms: Date.now() - phaseStart,
          ok: true,
          source: expResult.source,
          cacheTier: expResult.cacheTier,
        });
      } catch (error) {
        phases.push({
          name: "options",
          key: optionsSymbol,
          ms: Date.now() - phaseStart,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  return {
    startedAt,
    totalMs: Date.now() - startedAt,
    phases,
    traceId,
  };
}
