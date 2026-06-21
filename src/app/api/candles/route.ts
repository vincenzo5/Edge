import { NextResponse } from "next/server";
import { getChartCandles, type Candle } from "@/lib/yahoo";

export const runtime = "nodejs";

const VALID_RANGES = new Set(["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "ytd", "max"]);
const VALID_INTERVALS = new Set(["1d", "1wk", "1mo", "1h", "5m", "15m", "30m"]);

type CandlesResponse = { candles: Candle[] } | { error: string };

export async function POST(request: Request): Promise<Response> {
  let body: { symbol?: unknown; range?: unknown; interval?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const symbol = typeof body.symbol === "string" ? body.symbol.trim() : "";
  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }

  const range = typeof body.range === "string" && VALID_RANGES.has(body.range) ? body.range : "1y";
  const interval =
    typeof body.interval === "string" && VALID_INTERVALS.has(body.interval)
      ? body.interval
      : "1d";

  try {
    const candles = await getChartCandles(symbol, range as never, interval as never);
    const payload: CandlesResponse = { candles };
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch candles";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
