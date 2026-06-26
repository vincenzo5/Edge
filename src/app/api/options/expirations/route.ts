import { NextResponse } from "next/server";
import {
  optionsExpirationsQuerySchema,
  parseMarketQuery,
} from "@/lib/marketData/schemas";
import { getServerMarketDataService } from "@/lib/marketData/service/server";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const parsed = parseMarketQuery(url.searchParams, optionsExpirationsQuerySchema);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, details: parsed.details },
      { status: 400 },
    );
  }

  try {
    const service = getServerMarketDataService();
    const result = await service.getOptionExpirations(parsed.data.underlying);
    return NextResponse.json({
      expirations: result.data,
      meta: {
        source: result.source,
        stale: result.stale,
        warnings: result.warnings,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch option expirations";
    return NextResponse.json({
      expirations: [],
      meta: {
        source: "none",
        stale: true,
        warnings: [message],
      },
    });
  }
}
