import { describe, expect, it, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { isSensitiveRoute, isDevOpenAuthMode, verifyApiKey } from "./apiAuth";

function requestWithIp(
  url: string,
  ip: string,
  init?: RequestInit,
): NextRequest {
  const req = new NextRequest(url, init);
  Object.defineProperty(req, "ip", { value: ip, configurable: true });
  return req;
}

describe("apiAuth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("classifies sensitive routes", () => {
    expect(isSensitiveRoute("/api/brokerage/status")).toBe(true);
    expect(isSensitiveRoute("/api/ai/tools/execute")).toBe(true);
    expect(isSensitiveRoute("/api/market-data/tws/recover")).toBe(true);
    expect(isSensitiveRoute("/api/candles")).toBe(false);
    expect(isSensitiveRoute("/api/quotes")).toBe(false);
  });

  it("rejects sensitive routes when EDGE_API_KEY is unset outside dev-open", () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.EDGE_API_KEY;
    delete process.env.EDGE_API_AUTH_MODE;
    const req = requestWithIp("http://localhost/api/brokerage/status", "127.0.0.1");
    expect(verifyApiKey(req, "/api/brokerage/status")).toEqual({
      ok: false,
      status: 401,
      message:
        "API key required. Set EDGE_API_KEY or EDGE_API_AUTH_MODE=dev-open (non-production only).",
    });
  });

  it("allows sensitive routes in dev-open mode without API key", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("EDGE_API_AUTH_MODE", "dev-open");
    delete process.env.EDGE_API_KEY;
    const req = requestWithIp("http://localhost/api/brokerage/status", "127.0.0.1");
    expect(verifyApiKey(req, "/api/brokerage/status")).toEqual({ ok: true });
    expect(isDevOpenAuthMode()).toBe(true);
  });

  it("requires API key when configured and peer is not loopback", () => {
    vi.stubEnv("EDGE_API_KEY", "secret-key");
    vi.stubEnv("EDGE_TRUST_LOCALHOST", "false");
    const req = requestWithIp("http://example.com/api/brokerage/status", "203.0.113.1", {
      headers: { "x-forwarded-for": "203.0.113.1" },
    });
    expect(verifyApiKey(req, "/api/brokerage/status")).toEqual({
      ok: false,
      status: 401,
      message: "Missing or invalid API key.",
    });
  });

  it("accepts matching X-Edge-Api-Key header", () => {
    vi.stubEnv("EDGE_API_KEY", "secret-key");
    vi.stubEnv("EDGE_TRUST_LOCALHOST", "false");
    const req = requestWithIp("http://example.com/api/ai/tools", "203.0.113.1", {
      headers: {
        "x-forwarded-for": "203.0.113.1",
        "x-edge-api-key": "secret-key",
      },
    });
    expect(verifyApiKey(req, "/api/ai/tools")).toEqual({ ok: true });
  });

  it("does not trust spoofed X-Forwarded-For without trusted proxy count", () => {
    vi.stubEnv("EDGE_API_KEY", "secret-key");
    delete process.env.EDGE_TRUSTED_PROXY_COUNT;
    const req = requestWithIp("http://example.com/api/brokerage/status", "203.0.113.1", {
      headers: { "x-forwarded-for": "127.0.0.1" },
    });
    expect(verifyApiKey(req, "/api/brokerage/status")).toEqual({
      ok: false,
      status: 401,
      message: "Missing or invalid API key.",
    });
  });

  it("trusts loopback peer when EDGE_TRUST_LOCALHOST is default", () => {
    vi.stubEnv("EDGE_API_KEY", "secret-key");
    delete process.env.EDGE_TRUST_LOCALHOST;
    const req = requestWithIp("http://localhost/api/brokerage/status", "127.0.0.1", {
      headers: { "x-forwarded-for": "127.0.0.1" },
    });
    expect(verifyApiKey(req, "/api/brokerage/status")).toEqual({ ok: true });
  });

  it("accepts matching Authorization bearer token", () => {
    vi.stubEnv("EDGE_API_KEY", "secret-key");
    vi.stubEnv("EDGE_TRUST_LOCALHOST", "false");
    const req = requestWithIp("http://example.com/api/ai/tools", "203.0.113.1", {
      headers: {
        authorization: "Bearer secret-key",
      },
    });
    expect(verifyApiKey(req, "/api/ai/tools")).toEqual({ ok: true });
  });
});
