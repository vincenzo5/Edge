import type { DataResult } from "../contracts/result";
import type { DatasetId } from "./catalog";
import type { RouteDecision } from "./observation";
import type { TransportDimension } from "./dimensions";
import {
  recordDeliveryFromResult,
  recordTerminalDeliveryFailure,
  transportFromCacheTier,
} from "./deliveryRegistry";
import type { RouteCollector } from "./routeCollector";

export type DeliveryRecordContext = {
  route?: RouteDecision;
  transport?: TransportDimension;
  traceId?: string;
};

export function recordServiceDelivery<T>(
  result: DataResult<T>,
  datasetId: DatasetId,
  context: DeliveryRecordContext = {},
): DataResult<T> {
  try {
    recordDeliveryFromResult(result, datasetId, {
      route: context.route,
      transport: context.transport ?? transportFromCacheTier(result.cacheTier),
      traceId: context.traceId ?? result.traceId,
    });
  } catch {
    // no-throw — instrumentation must not alter service delivery
  }
  return result;
}

export function finalizeRouteDelivery<T>(
  result: DataResult<T>,
  datasetId: DatasetId,
  collector: RouteCollector,
  options: {
    fallbackReason?: string;
    transport?: TransportDimension;
    traceId?: string;
  } = {},
): DataResult<T> {
  try {
    const route = collector.buildDecision(result.source, options.fallbackReason);
    recordServiceDelivery(result, datasetId, {
      route,
      transport: options.transport ?? transportFromCacheTier(result.cacheTier),
      traceId: options.traceId ?? result.traceId,
    });
  } catch {
    // no-throw — route finalization is instrumentation only
  }
  return result;
}

export function inferFallbackReason(warnings: string[]): string | undefined {
  const fallback = warnings.find(
    (w) =>
      w.includes("falling back") ||
      w.includes("trying next") ||
      w.includes("Filling via Yahoo") ||
      w.includes("skipped"),
  );
  return fallback;
}

export async function recordTerminalFailureOnReject<T>(
  datasetId: DatasetId,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    recordTerminalDeliveryFailure(datasetId);
    throw error;
  }
}
