import { NextResponse } from "next/server";
import type { DataResult } from "@/lib/marketData/contracts/result";
import { dataResultToResponseMeta } from "@/lib/marketData/contracts/result";

export function fmpJsonResponse<T>(
  dataKey: string,
  result: DataResult<T>,
): Response {
  return NextResponse.json({
    [dataKey]: result.data,
    meta: dataResultToResponseMeta(result),
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
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: message }, { status: 500 });
}
