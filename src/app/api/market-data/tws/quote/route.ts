import { NextResponse } from "next/server";
import { parseMarketQuery, twsSymbolQuerySchema } from "@/lib/marketData/schemas";
import { getServerMarketDataService } from "@/lib/marketData/service/server";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const parsed = parseMarketQuery(url.searchParams, twsSymbolQuerySchema);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, details: parsed.details },
      { status: 400 },
    );
  }

  try {
    const service = getServerMarketDataService();
    const result = await service.getTwsQuoteProbe(parsed.data.symbol);
    return NextResponse.json({
      quote: result.data,
      meta: {
        source: result.source,
        stale: result.stale,
        warnings: result.warnings,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed TWS quote probe";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
