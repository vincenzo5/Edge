import { describe, expect, it, vi, afterEach } from "vitest";
import { isSensitiveRoute, verifyApiKey } from "./apiAuth";

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

  it("allows sensitive routes when EDGE_API_KEY is unset", () => {
    delete process.env.EDGE_API_KEY;
    const req = new Request("http://localhost/api/brokerage/status");
    expect(verifyApiKey(req, "/api/brokerage/status")).toEqual({ ok: true });
  });

  it("requires API key when configured", () => {
    vi.stubEnv("EDGE_API_KEY", "secret-key");
    vi.stubEnv("EDGE_TRUST_LOCALHOST", "false");
    const req = new Request("http://example.com/api/brokerage/status", {
      headers: { "x-forwarded-for": "203.0.113.1" },
    });
    expect(verifyApiKey(req, "/api/brokerage/status")).toEqual({
      ok: false,
      status: 401,
      message: "Missing or invalid API key for sensitive route.",
    });
  });

  it("accepts matching X-Edge-Api-Key header", () => {
    vi.stubEnv("EDGE_API_KEY", "secret-key");
    vi.stubEnv("EDGE_TRUST_LOCALHOST", "false");
    const req = new Request("http://example.com/api/ai/tools", {
      headers: {
        "x-forwarded-for": "203.0.113.1",
        "x-edge-api-key": "secret-key",
      },
    });
    expect(verifyApiKey(req, "/api/ai/tools")).toEqual({ ok: true });
  });

  it("trusts localhost when EDGE_TRUST_LOCALHOST is default", () => {
    vi.stubEnv("EDGE_API_KEY", "secret-key");
    delete process.env.EDGE_TRUST_LOCALHOST;
    const req = new Request("http://localhost/api/brokerage/status", {
      headers: { "x-forwarded-for": "127.0.0.1" },
    });
    expect(verifyApiKey(req, "/api/brokerage/status")).toEqual({ ok: true });
  });

  it("accepts matching Authorization bearer token", () => {
    vi.stubEnv("EDGE_API_KEY", "secret-key");
    vi.stubEnv("EDGE_TRUST_LOCALHOST", "false");
    const req = new Request("http://example.com/api/ai/tools", {
      headers: {
        "x-forwarded-for": "203.0.113.1",
        authorization: "Bearer secret-key",
      },
    });
    expect(verifyApiKey(req, "/api/ai/tools")).toEqual({ ok: true });
  });
});
