import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRequestThrottle } from "./requestThrottle";

describe("createRequestThrottle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("limits burst requests to max per second", async () => {
    const throttle = createRequestThrottle(3);
    const timestamps: number[] = [];

    const jobs = Array.from({ length: 6 }, () =>
      throttle.schedule(async () => {
        timestamps.push(Date.now());
      }),
    );

    await vi.runAllTimersAsync();
    await Promise.all(jobs);

    expect(timestamps).toHaveLength(6);
    for (let i = 3; i < timestamps.length; i += 1) {
      expect(timestamps[i]! - timestamps[i - 3]!).toBeGreaterThanOrEqual(900);
    }
  });
});
