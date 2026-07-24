import { describe, expect, it, vi, afterEach } from "vitest";
import { logAccess, sanitizeAccessPath, shouldEmitAccessLogs } from "./accessLog";

describe("accessLog", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("sanitizes path to pathname only", () => {
    expect(sanitizeAccessPath("/api/candles?token=secret")).toBe("/api/candles");
    expect(sanitizeAccessPath("api/search#frag")).toBe("/api/search");
  });

  it("no-ops in test environment", () => {
    vi.stubEnv("NODE_ENV", "test");
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    logAccess({
      method: "get",
      path: "/api/candles?token=secret",
      status: 200,
      durationMs: 12.4,
      requestId: "req-1",
    });
    expect(consoleSpy).not.toHaveBeenCalled();
    expect(shouldEmitAccessLogs()).toBe(false);
  });

  it("writes one JSON access line outside test runs", () => {
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.VITEST;
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    logAccess({
      method: "post",
      path: "/api/trading/orders?apiKey=secret",
      status: 401,
      durationMs: 3.7,
      requestId: "req-abc",
    });
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const line = JSON.parse(String(consoleSpy.mock.calls[0]?.[0]));
    expect(line).toMatchObject({
      event: "http.access",
      method: "POST",
      path: "/api/trading/orders",
      status: 401,
      durationMs: 4,
      requestId: "req-abc",
    });
    expect(String(consoleSpy.mock.calls[0]?.[0])).not.toContain("apiKey");
  });
});
