import { describe, expect, it, vi, beforeEach } from "vitest";
import { coalesceInFlight, resetCoalesceInFlightForTests } from "./coalesceInFlight";

describe("coalesceInFlight", () => {
  beforeEach(() => {
    resetCoalesceInFlightForTests();
  });

  it("shares one in-flight promise per key", async () => {
    const fn = vi.fn(async () => {
      await Promise.resolve();
      return "ok";
    });

    const first = coalesceInFlight("k", fn);
    const second = coalesceInFlight("k", fn);
    expect(fn).toHaveBeenCalledTimes(1);
    await expect(first).resolves.toBe("ok");
    await expect(second).resolves.toBe("ok");
  });

  it("allows a new request after the prior settles", async () => {
    const fn = vi
      .fn()
      .mockResolvedValueOnce("a")
      .mockResolvedValueOnce("b");

    await coalesceInFlight("k", fn);
    await expect(coalesceInFlight("k", fn)).resolves.toBe("b");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
