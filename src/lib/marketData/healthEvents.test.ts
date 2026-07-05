import { describe, expect, it, beforeEach } from "vitest";
import {
  getHealthEvents,
  recordHealthEvent,
  resetHealthEventsForTests,
} from "./healthEvents";

describe("healthEvents", () => {
  beforeEach(() => {
    resetHealthEventsForTests();
  });

  it("appends events to the session log", () => {
    recordHealthEvent({
      kind: "transport_fallback",
      message: "Quote stream first snapshot timeout",
      recovered: true,
      dataset: "watchlist",
    });
    expect(getHealthEvents()).toHaveLength(1);
    expect(getHealthEvents()[0]?.message).toContain("timeout");
    expect(getHealthEvents()[0]?.recovered).toBe(true);
  });

  it("dedupes identical events within the dedupe window", () => {
    const first = recordHealthEvent({
      kind: "transport_fallback",
      message: "Quote stream disconnected",
      dataset: "watchlist",
    });
    const second = recordHealthEvent({
      kind: "transport_fallback",
      message: "Quote stream disconnected",
      dataset: "watchlist",
    });
    expect(second.id).toBe(first.id);
    expect(getHealthEvents()).toHaveLength(1);
  });

  it("caps the session log at eight entries", () => {
    for (let index = 0; index < 10; index += 1) {
      recordHealthEvent({
        kind: "stream_error",
        message: `event-${index}`,
        at: Date.now() + index,
      });
    }
    expect(getHealthEvents()).toHaveLength(8);
    expect(getHealthEvents()[0]?.message).toBe("event-9");
  });
});
