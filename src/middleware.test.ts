import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { resetRateLimitStoreForTests } from "@/lib/api/rateLimit";
import { evaluateApiMiddleware } from "@/middleware";

describe("evaluateApiMiddleware", () => {
  beforeEach(() => {
    resetRateLimitStoreForTests();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetRateLimitStoreForTests();
  });

  it("passes through public routes", () => {
    vi.stubEnv("EDGE_API_AUTH_MODE", "dev-open");
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.EDGE_API_KEY;
    const req = new NextRequest("http://localhost/api/candles", { method: "POST" });
    expect(evaluateApiMiddleware(req)).toBeNull();
  });

  it("blocks sensitive routes without API key when configured", () => {
    vi.stubEnv("EDGE_API_KEY", "secret");
    vi.stubEnv("EDGE_TRUST_LOCALHOST", "false");
    const req = new NextRequest("http://example.com/api/brokerage/status", {
      headers: { "x-forwarded-for": "203.0.113.5" },
    });
    const res = evaluateApiMiddleware(req);
    expect(res?.status).toBe(401);
  });

  it("returns 429 when rate limit exceeded", () => {
    vi.stubEnv("EDGE_RATE_LIMIT", "1");
    vi.stubEnv("EDGE_API_AUTH_MODE", "dev-open");
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.EDGE_API_KEY;
    const url = "http://localhost/api/market-data/warmup";
    const req = new NextRequest(url, { method: "POST" });
    Object.defineProperty(req, "ip", { value: "203.0.113.6", configurable: true });
    for (let i = 0; i < 10; i += 1) {
      expect(evaluateApiMiddleware(req)).toBeNull();
    }
    const blocked = evaluateApiMiddleware(req);
    expect(blocked?.status).toBe(429);
  });
});
