import { NextResponse } from "next/server";
import {
  optionsChainQuerySchema,
  parseMarketQuery,
} from "@/lib/marketData/schemas";
import { getServerMarketDataService } from "@/lib/marketData/service/server";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const parsed = parseMarketQuery(url.searchParams, optionsChainQuerySchema);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, details: parsed.details },
      { status: 400 },
    );
  }

  try {
    const service = getServerMarketDataService();
    const result = await service.getOptionsChain({
      underlying: parsed.data.underlying,
      expiration: parsed.data.expiration,
      strikeWindow: parsed.data.strikeWindow ?? { mode: "atm", count: 20 },
    });
    return NextResponse.json({
      chain: result.data,
      meta: {
        source: result.source,
        stale: result.stale,
        warnings: result.warnings,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch options chain";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
