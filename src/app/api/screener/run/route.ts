import { NextResponse } from "next/server";
import { getAllIndicators } from "@edge/chart-core";
import {
  parseMarketRequest,
  screenQuerySchema,
} from "@/lib/marketData/schemas";
import { getServerMarketDataService } from "@/lib/marketData/service/server";
import {
  fmpJsonResponse,
  providerErrorResponse,
  validationErrorResponse,
} from "@/lib/marketData/service/fmpRouteHelpers";
import {
  createRoutePerfContext,
  readMarketDataTraceFromRequest,
} from "@/lib/marketData/telemetry";
import { isMarketDataPerfEnabled } from "@/lib/marketData/telemetry/isPerfEnabled";
import { validateScreenQueryTechnical } from "@/lib/screener/validateIndicatorRule";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const routeStartedAt = Date.now();
  const { traceId, scenario } = readMarketDataTraceFromRequest(request);
  const perfContext = createRoutePerfContext(traceId, scenario ?? "screener.run");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validateStartedAt = Date.now();
  const parsed = parseMarketRequest(body, screenQuerySchema);
  perfContext.collector.record("api.validate", validateStartedAt, parsed.ok, "api");
  if (!parsed.ok) return validationErrorResponse(parsed);

  const semanticValidation = validateScreenQueryTechnical(
    parsed.data.technical,
    getAllIndicators(),
  );
  if (!semanticValidation.ok) {
    return NextResponse.json(
      {
        error: "Invalid technical rule",
        details: semanticValidation.errors,
      },
      { status: 400 },
    );
  }

  try {
    const service = getServerMarketDataService();
    const serviceStartedAt = Date.now();
    const result = await service.getScreenerResults(parsed.data, {
      perf: perfContext.collector,
      traceId,
    });
    perfContext.collector.record("api.service.getScreenerResults", serviceStartedAt, true, "api", {
      rows: result.data.length,
      hadTechnical: parsed.data.technical != null,
    });
    perfContext.collector.record("api.total", routeStartedAt, true, "api");

    return fmpJsonResponse("results", result, {
      traceId: isMarketDataPerfEnabled() ? traceId : undefined,
      phases: isMarketDataPerfEnabled() ? perfContext.collector.toArray() : undefined,
    });
  } catch (error) {
    perfContext.collector.record("api.total", routeStartedAt, false, "api", {
      error: error instanceof Error ? error.message : String(error),
    });
    return providerErrorResponse(error, "Failed to run stock screener");
  }
}
