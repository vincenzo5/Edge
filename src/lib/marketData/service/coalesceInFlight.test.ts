import { describe, it, expect, vi, beforeEach } from "vitest";
import { coalesceInFlight, resetCoalesceInFlightForTests } from "./coalesceInFlight";

describe("marketData coalesceInFlight", () => {
  beforeEach(() => {
    resetCoalesceInFlightForTests();
  });

  it("shares one in-flight promise per key", async () => {
    const fn = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return "ok";
    });

    const first = coalesceInFlight("server:search:foo", fn);
    const second = coalesceInFlight("server:search:foo", fn);

    expect(first).toBe(second);
    await expect(first).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("runs again after the first flight settles", async () => {
    const fn = vi
      .fn()
      .mockResolvedValueOnce("a")
      .mockResolvedValueOnce("b");

    await coalesceInFlight("server:candles:k", fn);
    await expect(coalesceInFlight("server:candles:k", fn)).resolves.toBe("b");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
