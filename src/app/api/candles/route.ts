import { NextResponse } from "next/server";
import { jsonErrorResponse } from "@/lib/api/safeErrorResponse";
import {
  candlesRequestSchema,
  parseMarketRequest,
} from "@/lib/marketData/schemas";
import { enrichResponseMetaWithTrust } from "@/lib/marketData/trust/enrichResponseMeta";
import {
  clearMarketDataCacheForTests,
  getServerMarketDataService,
} from "@/lib/marketData/service/server";
import {
  createRoutePerfContext,
  readMarketDataTraceFromRequest,
} from "@/lib/marketData/telemetry";
import { isMarketDataPerfEnabled } from "@/lib/marketData/telemetry/isPerfEnabled";

export const runtime = "nodejs";

export { clearMarketDataCacheForTests as clearCandleCacheForTests };

export async function POST(request: Request): Promise<Response> {
  const routeStartedAt = Date.now();
  const { traceId, scenario } = readMarketDataTraceFromRequest(request);
  const perfContext = createRoutePerfContext(traceId, scenario);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validateStartedAt = Date.now();
  const parsed = parseMarketRequest(body, candlesRequestSchema);
  perfContext.collector.record("api.validate", validateStartedAt, parsed.ok, "api");
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, details: parsed.details },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const service = getServerMarketDataService();

  try {
    const serviceStartedAt = Date.now();
    const result = await service.getLegacyCandles(
      {
        symbol: input.symbol,
        range: input.before == null ? (input.range ?? "1y") : undefined,
        interval: input.interval,
        beforeTimestamp: input.before,
        barCount: input.barCount,
        sessionMode: input.sessionMode,
      },
      { traceId },
    );
    perfContext.collector.record("api.service.getLegacyCandles", serviceStartedAt, true, "api", {
      source: result.source,
      cacheTier: result.cacheTier,
      barCount: result.data.length,
    });
    perfContext.collector.record("api.total", routeStartedAt, true, "api");

    const meta = {
      ...enrichResponseMetaWithTrust(result, "chart_candles", "display"),
      ...(isMarketDataPerfEnabled()
        ? {
            traceId,
            phases: [
              ...perfContext.collector.toArray(),
              ...(result.phases ?? []),
            ],
          }
        : {}),
    };

    return NextResponse.json({
      candles: result.data,
      meta,
    });
  } catch (error) {
    perfContext.collector.record("api.total", routeStartedAt, false, "api", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonErrorResponse(error, "Failed to fetch candles", 500);
  }
}
