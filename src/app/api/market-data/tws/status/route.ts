import { NextResponse } from "next/server";
import { getServerMarketDataService } from "@/lib/marketData/service/server";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  try {
    const service = getServerMarketDataService();
    const result = await service.getTwsStatusProbe();
    return NextResponse.json({
      status: result.data,
      meta: {
        source: result.source,
        stale: result.stale,
        warnings: result.warnings,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed TWS status probe";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
