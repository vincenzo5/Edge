import { NextResponse } from "next/server";
import {
  parseMarketRequest,
  searchRequestSchema,
} from "@/lib/marketData/schemas";
import { getServerMarketDataService } from "@/lib/marketData/service/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseMarketRequest(body, searchRequestSchema);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, details: parsed.details },
      { status: 400 },
    );
  }

  const query = parsed.data.query.trim();
  if (!query) {
    return NextResponse.json({ results: [] });
  }

  try {
    const service = getServerMarketDataService();
    const result = await service.searchInstruments(query, parsed.data.limit ?? 8);
    return NextResponse.json({ results: result.data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
