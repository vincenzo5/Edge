import { describe, expect, it } from "vitest";
import {
  SSE_COLD_FIRST_PAINT_MS,
  SSE_RECONNECT_FIRST_PAINT_MS,
  resolveQuoteStreamFirstPaintMs,
} from "./quoteStreamPolicy";

describe("quoteStreamPolicy", () => {
  it("uses cold deadline when no quotes are populated", () => {
    expect(resolveQuoteStreamFirstPaintMs(false)).toBe(SSE_COLD_FIRST_PAINT_MS);
  });

  it("uses reconnect deadline when quotes already exist", () => {
    expect(resolveQuoteStreamFirstPaintMs(true)).toBe(SSE_RECONNECT_FIRST_PAINT_MS);
  });
});
