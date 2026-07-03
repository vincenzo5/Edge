import { NextResponse } from "next/server";
import { jsonErrorResponse } from "@/lib/api/safeErrorResponse";
import {
  parseMarketRequest,
  quotesRequestSchema,
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

export { clearMarketDataCacheForTests as clearQuoteCacheForTests };

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
  const parsed = parseMarketRequest(body, quotesRequestSchema);
  perfContext.collector.record("api.validate", validateStartedAt, parsed.ok, "api");
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, details: parsed.details },
      { status: 400 },
    );
  }

  try {
    const service = getServerMarketDataService();
    const serviceStartedAt = Date.now();
    const result = await service.getWatchlistQuotes(parsed.data.symbols, { traceId });
    perfContext.collector.record("api.service.getWatchlistQuotes", serviceStartedAt, true, "api", {
      source: result.source,
      cacheTier: result.cacheTier,
      quoteCount: result.data.length,
    });
    perfContext.collector.record("api.total", routeStartedAt, true, "api");

    const meta = {
      ...enrichResponseMetaWithTrust(result, "watchlist_quotes", "display"),
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
      quotes: result.data,
      meta,
    });
  } catch (error) {
    perfContext.collector.record("api.total", routeStartedAt, false, "api", {
      error: error instanceof Error ? error.message : String(error),
    });
    return jsonErrorResponse(error, "Failed to fetch quotes", 500);
  }
}
