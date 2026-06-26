import { NextResponse } from 'next/server';
import { getServerMarketDataService } from '@/lib/marketData/service/server';
import { createQuoteStreamSession } from '@/lib/marketData/stream/createStreamSession';
import { parseQuoteStreamQuery } from '@/lib/marketData/stream/streamQuerySchemas';
import { createSseResponse } from '@/lib/marketData/stream/sseResponse';

export const runtime = 'nodejs';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const parsed = parseQuoteStreamQuery(url.searchParams);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const service = getServerMarketDataService();

  return createSseResponse(
    (send) => createQuoteStreamSession(service, parsed.data),
    request.signal,
  );
}
