import { NextResponse } from "next/server";
import { getFundamentalsSnapshot } from "@/lib/yahoo";

export const runtime = "nodejs";

const FUNDAMENTALS_TTL_MS = 6 * 60 * 60 * 1000;

type CacheEntry = {
  snapshot: Awaited<ReturnType<typeof getFundamentalsSnapshot>>;
  expiresAt: number;
};

const fundamentalsCache = new Map<string, CacheEntry>();

function readCache(symbol: string): Awaited<ReturnType<typeof getFundamentalsSnapshot>> | null {
  const entry = fundamentalsCache.get(symbol);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    fundamentalsCache.delete(symbol);
    return null;
  }
  return { ...entry.snapshot };
}

function writeCache(
  symbol: string,
  snapshot: Awaited<ReturnType<typeof getFundamentalsSnapshot>>,
): void {
  fundamentalsCache.set(symbol, {
    snapshot: { ...snapshot },
    expiresAt: Date.now() + FUNDAMENTALS_TTL_MS,
  });
}

/** Test-only helper to reset the in-memory response cache. */
export function clearFundamentalsCacheForTests(): void {
  fundamentalsCache.clear();
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const raw = url.searchParams.get("symbol");
  const symbol = typeof raw === "string" ? raw.trim().toUpperCase() : "";
  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }

  const cached = readCache(symbol);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const snapshot = await getFundamentalsSnapshot(symbol);
    writeCache(symbol, snapshot);
    return NextResponse.json({ ...snapshot });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch fundamentals";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
