import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { resetRateLimitStoreForTests } from "@/lib/api/rateLimit";
import {
  applyRequestIdHeader,
  buildForwardRequestHeaders,
  evaluateApiMiddleware,
  middleware,
} from "@/middleware";

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

describe("request id middleware", () => {
  beforeEach(() => {
    resetRateLimitStoreForTests();
    vi.stubEnv("EDGE_API_AUTH_MODE", "dev-open");
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.EDGE_API_KEY;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetRateLimitStoreForTests();
  });

  it("forwards accepted request id to downstream headers", () => {
    const req = new NextRequest("http://localhost/api/candles", {
      headers: { "x-edge-request-id": "client-req-1" },
    });
    const headers = buildForwardRequestHeaders(req);
    expect(headers.get("x-edge-request-id")).toBe("client-req-1");
  });

  it("sets response header on pass-through", () => {
    const req = new NextRequest("http://localhost/api/candles", {
      headers: { "x-edge-request-id": "client-req-2" },
    });
    const res = middleware(req);
    expect(res.headers.get("x-edge-request-id")).toBe("client-req-2");
  });

  it("sets response header on auth and rate-limit blocks", () => {
    vi.stubEnv("EDGE_API_KEY", "secret");
    vi.stubEnv("EDGE_TRUST_LOCALHOST", "false");
    const authReq = new NextRequest("http://example.com/api/brokerage/status", {
      headers: {
        "x-forwarded-for": "203.0.113.5",
        "x-edge-request-id": "blocked-auth",
      },
    });
    expect(middleware(authReq).headers.get("x-edge-request-id")).toBe("blocked-auth");

    vi.unstubAllEnvs();
    vi.stubEnv("EDGE_RATE_LIMIT", "1");
    vi.stubEnv("EDGE_API_AUTH_MODE", "dev-open");
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.EDGE_API_KEY;
    const rateReq = new NextRequest("http://localhost/api/market-data/warmup", {
      method: "POST",
      headers: { "x-edge-request-id": "blocked-rate" },
    });
    Object.defineProperty(rateReq, "ip", { value: "203.0.113.6", configurable: true });
    for (let i = 0; i < 10; i += 1) {
      middleware(rateReq);
    }
    expect(middleware(rateReq).headers.get("x-edge-request-id")).toBe("blocked-rate");
  });

  it("applyRequestIdHeader sets configured header name", () => {
    vi.stubEnv("EDGE_REQUEST_ID_HEADER", "x-request-id");
    const response = applyRequestIdHeader(new Response(null), "rid-9");
    expect(response.headers.get("x-request-id")).toBe("rid-9");
  });
});
