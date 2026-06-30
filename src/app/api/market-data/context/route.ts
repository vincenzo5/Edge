import { NextResponse } from "next/server";
import {
  marketContextQuerySchema,
  parseMarketQuery,
} from "@/lib/marketData/schemas";
import { getServerMarketDataService } from "@/lib/marketData/service/server";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const parsed = parseMarketQuery(url.searchParams, marketContextQuerySchema);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, details: parsed.details },
      { status: 400 },
    );
  }

  try {
    const service = getServerMarketDataService();
    const result = await service.getMarketContext(parsed.data.symbol);
    return NextResponse.json({
      context: result.data,
      meta: {
        source: result.source,
        requestedAt: result.requestedAt,
        receivedAt: result.receivedAt,
        asOf: result.asOf,
        stale: result.stale,
        warnings: result.warnings ?? [],
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch market context";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
