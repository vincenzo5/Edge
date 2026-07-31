import { describe, expect, it } from "vitest";

import { resolveEntryScheduleFireAt } from "./resolveEntrySchedule";

describe("resolveEntryScheduleFireAt", () => {
  it("returns null for immediate schedule", () => {
    expect(resolveEntryScheduleFireAt({ kind: "immediate" })).toBeNull();
  });

  it("returns clock at verbatim", () => {
    expect(
      resolveEntryScheduleFireAt({
        kind: "clock",
        at: "2026-07-31T13:35:00.000Z",
        timeZone: "America/New_York",
      }),
    ).toBe("2026-07-31T13:35:00.000Z");
  });

  it("resolves nextRthOpen to a future ISO timestamp", () => {
    const fireAt = resolveEntryScheduleFireAt(
      { kind: "sessionEvent", event: "nextRthOpen" },
      new Date("2026-07-15T12:00:00.000Z"),
    );
    expect(fireAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(Date.parse(fireAt!)).toBeGreaterThan(Date.parse("2026-07-15T12:00:00.000Z"));
  });
});
