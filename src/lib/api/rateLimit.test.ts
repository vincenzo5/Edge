import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  checkRateLimit,
  isRateLimitEnabled,
  resetRateLimitStoreForTests,
  resolveRateLimitBucket,
} from "./rateLimit";

describe("rateLimit", () => {
  beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetRateLimitStoreForTests();
  });

  it("is disabled unless EDGE_RATE_LIMIT=1", () => {
    delete process.env.EDGE_RATE_LIMIT;
    expect(isRateLimitEnabled()).toBe(false);
    vi.stubEnv("EDGE_RATE_LIMIT", "1");
    expect(isRateLimitEnabled()).toBe(true);
  });

  it("resolves buckets for expensive and ai routes", () => {
    expect(resolveRateLimitBucket("/api/screener/run")).toBe("expensive");
    expect(resolveRateLimitBucket("/api/market-data/warmup")).toBe("expensive");
    expect(resolveRateLimitBucket("/api/ai/tools/execute")).toBe("ai");
    expect(resolveRateLimitBucket("/api/stream/quotes")).toBe("stream");
    expect(resolveRateLimitBucket("/api/candles")).toBeNull();
  });

  it("allows requests when rate limiting is disabled", () => {
    delete process.env.EDGE_RATE_LIMIT;
    const req = new Request("http://localhost/api/screener/run", {
      method: "POST",
      headers: { "x-forwarded-for": "127.0.0.1" },
    });
    expect(checkRateLimit(req, "/api/screener/run")).toEqual({ ok: true });
  });

  it("returns 429 after exceeding expensive bucket", () => {
    vi.stubEnv("EDGE_RATE_LIMIT", "1");
    const pathname = "/api/market-data/warmup";
    const req = new Request("http://localhost/api/market-data/warmup", {
      method: "POST",
      headers: { "x-forwarded-for": "198.51.100.10" },
    });

    for (let i = 0; i < 10; i += 1) {
      expect(checkRateLimit(req, pathname)).toEqual({ ok: true });
    }
    const blocked = checkRateLimit(req, pathname);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.status).toBe(429);
      expect(blocked.retryAfterSec).toBeGreaterThan(0);
    }
  });

  it("tracks concurrent stream connections", () => {
    vi.stubEnv("EDGE_RATE_LIMIT", "1");
    const pathname = "/api/stream/quotes";
    const req = new Request("http://localhost/api/stream/quotes", {
      headers: { "x-forwarded-for": "198.51.100.11" },
    });

    const releases: Array<(() => void) | undefined> = [];
    for (let i = 0; i < 5; i += 1) {
      const result = checkRateLimit(req, pathname);
      expect(result.ok).toBe(true);
      if (result.ok) releases.push(result.release);
    }

    const blocked = checkRateLimit(req, pathname);
    expect(blocked.ok).toBe(false);

    releases[0]?.();
    const reopened = checkRateLimit(req, pathname);
    expect(reopened.ok).toBe(true);
    if (reopened.ok) reopened.release?.();
  });
});
