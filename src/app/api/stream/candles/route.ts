import { NextResponse } from 'next/server';
import { getServerMarketDataService } from '@/lib/marketData/service/server';
import { createCandleStreamSession } from '@/lib/marketData/stream/createStreamSession';
import { parseCandleStreamQuery } from '@/lib/marketData/stream/streamQuerySchemas';
import { createSseResponse } from '@/lib/marketData/stream/sseResponse';

export const runtime = 'nodejs';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const parsed = parseCandleStreamQuery(url.searchParams);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const service = getServerMarketDataService();
  const query = parsed.data;

  return createSseResponse(
    (send) => createCandleStreamSession(service, query),
    request.signal,
  );
}
