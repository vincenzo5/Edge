import { NextResponse } from "next/server";
import { parseMarketRequest, warmupRequestSchema } from "@/lib/marketData/schemas";
import { getServerMarketDataService } from "@/lib/marketData/service/server";
import {
  createRoutePerfContext,
  readMarketDataTraceFromRequest,
} from "@/lib/marketData/telemetry";
import { isMarketDataPerfEnabled } from "@/lib/marketData/telemetry/isPerfEnabled";

export const runtime = "nodejs";

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
  const parsed = parseMarketRequest(body, warmupRequestSchema);
  perfContext.collector.record("api.validate", validateStartedAt, parsed.ok, "api");
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, details: parsed.details },
      { status: 400 },
    );
  }

  const service = getServerMarketDataService();
  const serviceStartedAt = Date.now();
  const WARMUP_ROUTE_BUDGET_MS = 25_000;
  const warmup = await Promise.race([
    service.primeMarketData({
      symbols: parsed.data.symbols,
      candleRequests: parsed.data.candleRequests.map((row) => ({
        symbol: row.symbol,
        interval: row.interval,
        range: row.range,
      })),
      optionsSymbol: parsed.data.optionsSymbol,
      traceId,
    }),
    new Promise<Awaited<ReturnType<typeof service.primeMarketData>>>((resolve) => {
      setTimeout(
        () =>
          resolve({
            startedAt: routeStartedAt,
            totalMs: Date.now() - routeStartedAt,
            phases: [
              {
                name: "warmup.route",
                ms: WARMUP_ROUTE_BUDGET_MS,
                ok: false,
                error: "Warmup route budget exceeded",
              },
            ],
            traceId,
          }),
        WARMUP_ROUTE_BUDGET_MS,
      );
    }),
  ]);
  perfContext.collector.record("api.service.primeMarketData", serviceStartedAt, true, "api", {
    phases: warmup.phases.length,
    totalMs: warmup.totalMs,
  });
  perfContext.collector.record("api.total", routeStartedAt, true, "api");

  const responseWarmup = isMarketDataPerfEnabled()
    ? {
        ...warmup,
        traceId,
        apiPhases: perfContext.collector.toArray(),
      }
    : warmup;

  return NextResponse.json({ ok: true, warmup: responseWarmup });
}
