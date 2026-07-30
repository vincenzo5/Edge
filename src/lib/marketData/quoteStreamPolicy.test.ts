import { describe, expect, it } from "vitest";
import {
  SSE_COLD_FIRST_PAINT_MS,
  SSE_RECONNECT_BASE_MS,
  SSE_RECONNECT_COOLDOWN_MS,
  SSE_RECONNECT_FIRST_PAINT_MS,
  SSE_RECONNECT_MAX_ATTEMPTS,
  SSE_RECONNECT_MAX_MS,
  resolveQuoteStreamFirstPaintMs,
  resolveSseReconnectDelayMs,
  resolveTwsSseReconnectDelayMs,
} from "./quoteStreamPolicy";

describe("quoteStreamPolicy", () => {
  it("uses cold deadline when no quotes are populated", () => {
    expect(resolveQuoteStreamFirstPaintMs(false)).toBe(SSE_COLD_FIRST_PAINT_MS);
  });

  it("uses reconnect deadline when quotes already exist", () => {
    expect(resolveQuoteStreamFirstPaintMs(true)).toBe(SSE_RECONNECT_FIRST_PAINT_MS);
  });

  it("applies exponential backoff for SSE rejoin", () => {
    expect(resolveSseReconnectDelayMs(0)).toBe(SSE_RECONNECT_BASE_MS);
    expect(resolveSseReconnectDelayMs(1)).toBe(SSE_RECONNECT_BASE_MS * 2);
    expect(resolveSseReconnectDelayMs(10)).toBe(SSE_RECONNECT_MAX_MS);
  });

  it("caps TWS sidecar SSE reconnect backoff", () => {
    expect(resolveTwsSseReconnectDelayMs(0)).toBe(1_000);
    expect(resolveTwsSseReconnectDelayMs(3)).toBe(8_000);
  });

  it("documents sticky REST cooldown constants", () => {
    expect(SSE_RECONNECT_MAX_ATTEMPTS).toBeGreaterThan(0);
    expect(SSE_RECONNECT_COOLDOWN_MS).toBeGreaterThan(0);
  });
});
