import { NextResponse } from "next/server";
import {
  eventsQuerySchema,
  parseMarketQuery,
} from "@/lib/marketData/schemas";
import { dataResultToResponseMeta } from "@/lib/marketData/contracts/result";
import { getServerMarketDataService } from "@/lib/marketData/service/server";
import { marketEventToLegacyType } from "@/lib/marketData/events";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const parsed = parseMarketQuery(url.searchParams, eventsQuerySchema);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, details: parsed.details },
      { status: 400 },
    );
  }

  try {
    const service = getServerMarketDataService();
    const query = parsed.data;
    const result = await service.getMarketEvents({
      symbol: query.symbol,
      from: query.from,
      to: query.to,
      families: query.families,
      canonicalIds: query.canonicalIds,
      importance: query.importance,
      includeMacro: query.includeMacro,
    });

    const events = result.data.map((event) => ({
      ...event,
      type: marketEventToLegacyType(event),
    }));

    return NextResponse.json({
      events,
      meta: dataResultToResponseMeta(result),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch events";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
