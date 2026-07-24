import { describe, expect, it, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { readClientIp, readTrustedProxyCount } from "./clientIp";

describe("clientIp", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("ignores X-Forwarded-For when trusted proxy count is unset", () => {
    delete process.env.EDGE_TRUSTED_PROXY_COUNT;
    const req = new NextRequest("http://example.com/api/test", {
      headers: { "x-forwarded-for": "198.51.100.1" },
    });
    Object.defineProperty(req, "ip", { value: "203.0.113.1", configurable: true });
    expect(readClientIp(req)).toBe("203.0.113.1");
  });

  it("reads client hop from X-Forwarded-For when trusted proxy count is set", () => {
    vi.stubEnv("EDGE_TRUSTED_PROXY_COUNT", "1");
    const req = new NextRequest("http://example.com/api/test", {
      headers: { "x-forwarded-for": "198.51.100.1, 203.0.113.1" },
    });
    expect(readClientIp(req)).toBe("198.51.100.1");
    expect(readTrustedProxyCount()).toBe(1);
  });
});
