import type { MarketDataPerfPhase } from "../contracts/result";
import { isMarketDataPerfEnabled } from "./isPerfEnabled";
import { PerfPhaseCollector } from "./perfPhases";

export type RoutePerfContext = {
  traceId: string;
  scenario?: string;
  collector: PerfPhaseCollector;
};

export function createRoutePerfContext(
  traceId: string,
  scenario?: string,
): RoutePerfContext {
  return { traceId, scenario, collector: new PerfPhaseCollector() };
}

export function attachServicePhases<T extends { traceId?: string; phases?: MarketDataPerfPhase[] }>(
  result: T,
  context: RoutePerfContext,
): T {
  if (!isMarketDataPerfEnabled()) {
    return { ...result, traceId: context.traceId };
  }
  return {
    ...result,
    traceId: context.traceId,
    phases: [...context.collector.toArray(), ...(result.phases ?? [])],
  };
}

export function buildApiResponseMeta<T extends { traceId?: string; phases?: MarketDataPerfPhase[] }>(
  result: T,
  context: RoutePerfContext,
  extraPhases?: MarketDataPerfPhase[],
): {
  traceId?: string;
  phases?: MarketDataPerfPhase[];
} {
  if (!isMarketDataPerfEnabled()) {
    return {};
  }
  return {
    traceId: context.traceId,
    phases: [...context.collector.toArray(), ...(extraPhases ?? []), ...(result.phases ?? [])],
  };
}

export function stripPerfMeta<T extends { traceId?: string; phases?: MarketDataPerfPhase[] }>(
  result: T,
): T {
  if (isMarketDataPerfEnabled()) return result;
  const { traceId: _traceId, phases: _phases, ...rest } = result;
  return rest as T;
}
