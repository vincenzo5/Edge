import { NextResponse } from "next/server";
import { parseMarketRequest, twsRecoverRequestSchema } from "@/lib/marketData/schemas";
import { isTwsConfigured } from "@/lib/marketData/providers/tws/client";
import { recoverTwsSidecar } from "@/lib/marketData/providers/tws/recover";
import { getServerMarketDataService } from "@/lib/marketData/service/server";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  if (!isTwsConfigured()) {
    return NextResponse.json({ error: "TWS is not configured" }, { status: 403 });
  }

  let body: unknown = {};
  try {
    const text = await request.text();
    if (text.trim()) {
      body = JSON.parse(text) as unknown;
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseMarketRequest(body, twsRecoverRequestSchema);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, details: parsed.details },
      { status: 400 },
    );
  }

  try {
    const result = await recoverTwsSidecar(parsed.data.symbols);
    let warmup = null;

    if (result.ok && result.status.gatewayConnected) {
      const service = getServerMarketDataService();
      const candleRequests = parsed.data.candleRequests.map((row) => ({
        symbol: row.symbol,
        interval: row.interval,
        range: row.range,
      }));

      service.resetTwsRecoveryState({
        symbols: parsed.data.symbols,
        candleRequests,
      });

      warmup = await service.primeMarketData({
        symbols: parsed.data.symbols,
        candleRequests,
        optionsSymbol: parsed.data.optionsSymbol,
      });
    }

    return NextResponse.json({
      ok: result.ok,
      action: result.action,
      message: result.message,
      status: result.status,
      warmup,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "TWS recovery failed";
    const statusCode = message.includes("not configured") ? 403 : 500;
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
