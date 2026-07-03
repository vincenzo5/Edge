export type RateLimitBucket = "expensive" | "ai" | "stream";

type BucketConfig = {
  maxRequests: number;
  windowMs: number;
};

const BUCKET_CONFIG: Record<RateLimitBucket, BucketConfig> = {
  expensive: { maxRequests: 10, windowMs: 60_000 },
  ai: { maxRequests: 30, windowMs: 60_000 },
  stream: { maxRequests: 5, windowMs: 60_000 },
};

type WindowState = {
  timestamps: number[];
  activeStreams: number;
};

const store = new Map<string, WindowState>();

export function isRateLimitEnabled(): boolean {
  return process.env.EDGE_RATE_LIMIT === "1";
}

export function resolveRateLimitBucket(pathname: string): RateLimitBucket | null {
  if (pathname.startsWith("/api/stream/")) return "stream";
  if (pathname.startsWith("/api/ai/")) return "ai";
  if (
    pathname === "/api/screener/run" ||
    pathname === "/api/market-data/warmup" ||
    pathname.startsWith("/api/market-data/tws/recover")
  ) {
    return "expensive";
  }
  return null;
}

function readClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

function storeKey(ip: string, bucket: RateLimitBucket): string {
  return `${ip}:${bucket}`;
}

function pruneTimestamps(timestamps: number[], windowMs: number, now: number): number[] {
  return timestamps.filter((ts) => now - ts < windowMs);
}

export type RateLimitResult =
  | { ok: true; release?: () => void }
  | { ok: false; status: 429; retryAfterSec: number; message: string };

export function checkRateLimit(request: Request, pathname: string): RateLimitResult {
  if (!isRateLimitEnabled()) {
    return { ok: true };
  }

  const bucket = resolveRateLimitBucket(pathname);
  if (!bucket) {
    return { ok: true };
  }

  const config = BUCKET_CONFIG[bucket];
  const ip = readClientIp(request);
  const key = storeKey(ip, bucket);
  const now = Date.now();
  const state = store.get(key) ?? { timestamps: [], activeStreams: 0 };

  if (bucket === "stream") {
    if (state.activeStreams >= config.maxRequests) {
      return {
        ok: false,
        status: 429,
        retryAfterSec: 30,
        message: "Too many concurrent stream connections.",
      };
    }
    state.activeStreams += 1;
    store.set(key, state);
    return {
      ok: true,
      release: () => {
        const current = store.get(key);
        if (!current) return;
        current.activeStreams = Math.max(0, current.activeStreams - 1);
        store.set(key, current);
      },
    };
  }

  const pruned = pruneTimestamps(state.timestamps, config.windowMs, now);
  if (pruned.length >= config.maxRequests) {
    const oldest = pruned[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((config.windowMs - (now - oldest)) / 1000));
    return {
      ok: false,
      status: 429,
      retryAfterSec,
      message: "Rate limit exceeded.",
    };
  }

  pruned.push(now);
  store.set(key, { ...state, timestamps: pruned });
  return { ok: true };
}

/** Test helper — reset in-memory counters between Vitest cases. */
export function resetRateLimitStoreForTests(): void {
  store.clear();
}
