import { NextResponse } from "next/server";
import { jsonErrorResponse } from "@/lib/api/safeErrorResponse";
import type { DataResult } from "@/lib/marketData/contracts/result";
import type { MarketDataPerfPhase } from "@/lib/marketData/contracts/result";
import { dataResultToResponseMeta } from "@/lib/marketData/contracts/result";

export function fmpJsonResponse<T>(
  dataKey: string,
  result: DataResult<T>,
  perfOverlay?: { traceId?: string; phases?: MarketDataPerfPhase[] },
): Response {
  const meta = {
    ...dataResultToResponseMeta(result),
    ...(perfOverlay?.traceId ? { traceId: perfOverlay.traceId } : {}),
    ...(perfOverlay?.phases ? { phases: perfOverlay.phases } : {}),
  };
  return NextResponse.json({
    [dataKey]: result.data,
    meta,
  });
}

export function validationErrorResponse(parsed: {
  ok: false;
  error: string;
  details: unknown;
}): Response {
  return NextResponse.json(
    { error: parsed.error, details: parsed.details },
    { status: 400 },
  );
}

export function providerErrorResponse(error: unknown, fallback: string): Response {
  return jsonErrorResponse(error, fallback, 500);
}
