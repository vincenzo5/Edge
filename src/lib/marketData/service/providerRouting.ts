import type { DataProviderId } from "../contracts/result";
import type { DataProviderPreference } from "@/lib/connections/types";
import {
  classifyIbkrError,
  ibkrHealthGate,
  type IbkrWorkload,
} from "../providers/ibkr/healthGate";
import {
  classifyTwsError,
  twsHealthGate,
  type TwsWorkload,
} from "../providers/tws/healthGate";
import type { TwsStatusProbe } from "../providers/tws/client";
import {
  mergeProviderOrder,
  resolveWaterfallOrder,
  type TrustUsage,
} from "../providerWaterfall";
import type { MarketDataReadOptions } from "./marketDataServiceShared";
import {
  IBKR_AUTH_PROBE_TTL_MS,
  TWS_GATEWAY_PROBE_TTL_MS,
} from "./marketDataServiceShared";
import type { MarketDataServiceHost } from "./marketDataServiceHost";

export function getConfiguredProviderIds(svc: MarketDataServiceHost, ): Set<DataProviderId> {
  const configured = new Set<DataProviderId>(["yahoo"]);
  if (svc.tws.isConfigured()) configured.add("tws");
  if (svc.ibkr.isConfigured()) configured.add("ibkr");
  if (svc.massive.isConfigured()) configured.add("massive");
  if (svc.fmp.isConfigured()) configured.add("fmp");
  if (svc.fred.isConfigured()) configured.add("fred");
  if (svc.sec.isConfigured()) configured.add("sec");
  return configured;
}


export function resolveReadWaterfall(svc: MarketDataServiceHost, 
  capability: "equity_candles" | "equity_quotes" | "options_chain" | "options_expirations",
  options: Pick<
    MarketDataReadOptions,
    "providerPreference" | "respectProviderPreference" | "trustUsage"
  >,
): DataProviderId[] {
  const hasUserPreference =
    options.respectProviderPreference !== false && options.providerPreference != null;
  const preference = hasUserPreference
    ? options.providerPreference!
    : {
        orderedProviders: mergeProviderOrder([], capability),
        disabledProviders: [],
      };
  return resolveWaterfallOrder({
    preference,
    configured: getConfiguredProviderIds(svc, ),
    capability,
    respectPreference: hasUserPreference,
    usage: options.trustUsage,
  });
}


export function twsRoutingDecision(svc: MarketDataServiceHost, workload: TwsWorkload): { shouldTry: boolean; warning?: string } {
  if (!svc.tws.isConfigured()) {
    return { shouldTry: false };
  }
  if (twsHealthGate.shouldTryTws(workload)) {
    return { shouldTry: true };
  }
  const skipReason = twsHealthGate.getSkipReason();
  return {
    shouldTry: false,
    warning: skipReason ?? "TWS temporarily skipped (circuit open)",
  };
}


export function recordTwsSuccess(svc: MarketDataServiceHost, symbol?: string): void {
  twsHealthGate.recordSuccess();
  if (symbol) {
    void svc.tws.warmup?.([symbol]).catch(() => {});
  }
}


export function recordTwsFailure(svc: MarketDataServiceHost, error: unknown): void {
  twsHealthGate.recordFailure(classifyTwsError(error));
}


export function ibkrRoutingDecision(svc: MarketDataServiceHost, workload: IbkrWorkload): { shouldTry: boolean; warning?: string } {
  if (!svc.ibkr.isConfigured()) {
    return { shouldTry: false };
  }
  if (ibkrHealthGate.shouldTryIbkr(workload)) {
    return { shouldTry: true };
  }
  const skipReason = ibkrHealthGate.getSkipReason();
  return {
    shouldTry: false,
    warning: skipReason ?? "IBKR temporarily skipped (circuit open)",
  };
}


export function recordIbkrSuccess(svc: MarketDataServiceHost, ): void {
  ibkrHealthGate.recordSuccess();
}


export function recordIbkrFailure(svc: MarketDataServiceHost, error: unknown): void {
  ibkrHealthGate.recordFailure(classifyIbkrError(error));
}


export function storeTwsObservedStatus(svc: MarketDataServiceHost, status: TwsStatusProbe): TwsStatusProbe {
  const observedAt = Date.now();
  const observed: TwsStatusProbe = {
    ...status,
    observationConfidence: "observed",
    observedAt,
    circuitBypassed: false,
  };
  svc.lastTwsStatusProbe = observed;
  svc.lastTwsStatusObservedAt = observedAt;
  svc.twsGatewayConnected = status.gatewayConnected;
  svc.twsGatewayProbeAt = observedAt;
  return observed;
}


export function lastKnownTwsStatus(svc: MarketDataServiceHost, 
  partial: Partial<TwsStatusProbe>,
  warnings: string[],
): TwsStatusProbe {
  if (svc.lastTwsStatusProbe) {
    return {
      ...svc.lastTwsStatusProbe,
      ...partial,
      observationConfidence: "last_known",
      observedAt: svc.lastTwsStatusObservedAt || svc.lastTwsStatusProbe.observedAt,
      circuitBypassed: partial.circuitBypassed ?? true,
      warnings: [...new Set([...svc.lastTwsStatusProbe.warnings, ...warnings])],
    };
  }
  return {
    configured: partial.configured ?? true,
    sidecarReachable: partial.sidecarReachable ?? false,
    gatewayConnected: partial.gatewayConnected ?? false,
    observationConfidence: "unknown",
    circuitBypassed: partial.circuitBypassed ?? true,
    warnings,
  };
}

/** Proactively open the TWS circuit when Gateway is known disconnected or sidecar wedged. */

export async function ensureTwsGatewayProbe(svc: MarketDataServiceHost, ): Promise<void> {
  if (!svc.tws.isConfigured()) return;
  if (!twsHealthGate.shouldTryTws("status")) {
    return;
  }
  const now = Date.now();
  if (now - svc.twsGatewayProbeAt < TWS_GATEWAY_PROBE_TTL_MS) {
    if (!svc.twsGatewayConnected) {
      twsHealthGate.recordFailure("gateway_disconnected");
    }
    return;
  }
  const status = await svc.tws.probeStatus?.(2_000);
  svc.twsGatewayProbeAt = now;
  if (!status?.sidecarReachable) {
    svc.twsGatewayConnected = false;
    twsHealthGate.recordFailure("sidecar_unreachable");
    return;
  }
  if (status.restartRequired || status.diagnostics?.workerWedged) {
    svc.twsGatewayConnected = false;
    twsHealthGate.recordFailure("provider_error");
    storeTwsObservedStatus(svc, status);
    return;
  }
  storeTwsObservedStatus(svc, status);
  if (!status.gatewayConnected) {
    twsHealthGate.recordFailure("gateway_disconnected");
  }
}

/** Proactively open the IBKR circuit when Client Portal is known unauthenticated. */

export async function ensureIbkrAuthProbe(svc: MarketDataServiceHost, ): Promise<void> {
  if (!svc.ibkr.isConfigured()) return;
  const now = Date.now();
  if (now - svc.ibkrAuthProbeAt < IBKR_AUTH_PROBE_TTL_MS) {
    if (!svc.ibkrAuthenticated) {
      ibkrHealthGate.recordUnauthenticated();
    }
    return;
  }
  try {
    const status = await svc.ibkr.getStatusProbe();
    svc.ibkrAuthProbeAt = now;
    svc.ibkrAuthenticated = status.authenticated;
    if (status.gatewayReachable && !status.authenticated) {
      ibkrHealthGate.recordUnauthenticated();
    }
  } catch {
    svc.ibkrAuthProbeAt = now;
    svc.ibkrAuthenticated = false;
    ibkrHealthGate.recordFailure("gateway_unreachable");
  }
}

