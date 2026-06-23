import { NextResponse } from "next/server";
import { getQuoteSnapshots, normalizeSymbolList } from "@/lib/yahoo";

export const runtime = "nodejs";

const QUOTES_TTL_MS = 30_000;

type CacheEntry = {
  quotes: Awaited<ReturnType<typeof getQuoteSnapshots>>;
  expiresAt: number;
};

const quoteCache = new Map<string, CacheEntry>();

function buildCacheKey(symbols: string[]): string {
  return symbols.join(",");
}

function readCache(key: string): Awaited<ReturnType<typeof getQuoteSnapshots>> | null {
  const entry = quoteCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    quoteCache.delete(key);
    return null;
  }
  return entry.quotes.map((q) => ({ ...q }));
}

function writeCache(
  key: string,
  quotes: Awaited<ReturnType<typeof getQuoteSnapshots>>,
): void {
  quoteCache.set(key, {
    quotes: quotes.map((q) => ({ ...q })),
    expiresAt: Date.now() + QUOTES_TTL_MS,
  });
}

/** Test-only helper to reset the in-memory response cache. */
export function clearQuoteCacheForTests(): void {
  quoteCache.clear();
}

export async function POST(request: Request): Promise<Response> {
  let body: { symbols?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const symbols = normalizeSymbolList(body.symbols);
  if (symbols.length === 0) {
    return NextResponse.json({ error: "symbols must be a non-empty array" }, { status: 400 });
  }

  const cacheKey = buildCacheKey(symbols);
  const cached = readCache(cacheKey);
  if (cached) {
    return NextResponse.json({ quotes: cached });
  }

  try {
    const quotes = await getQuoteSnapshots(symbols);
    writeCache(cacheKey, quotes);
    return NextResponse.json({ quotes: quotes.map((q) => ({ ...q })) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch quotes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
