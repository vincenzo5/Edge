import { NextResponse } from "next/server";
import {
  fundamentalsQuerySchema,
  parseMarketQuery,
} from "@/lib/marketData/schemas";
import {
  clearMarketDataCacheForTests,
  getServerMarketDataService,
} from "@/lib/marketData/service/server";

export const runtime = "nodejs";

export { clearMarketDataCacheForTests as clearFundamentalsCacheForTests };

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const parsed = parseMarketQuery(url.searchParams, fundamentalsQuerySchema);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, details: parsed.details },
      { status: 400 },
    );
  }

  try {
    const service = getServerMarketDataService();
    const result = await service.getWatchlistFundamentals(parsed.data.symbol);
    return NextResponse.json(result.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch fundamentals";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
