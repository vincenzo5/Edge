import { describe, expect, it } from "vitest";

import {
  flexDateTimeToUtcIso,
  reinterpretUtcComponentsAsEastern,
  zonedWallTimeToUtcIso,
} from "@/lib/journal/flexImport/flexDateTime";

describe("flexDateTime", () => {
  it("maps Flex EDT wall clock to UTC ISO", () => {
    // 2026-06-24 is EDT (UTC-4)
    expect(flexDateTimeToUtcIso("20260624;093542")).toBe("2026-06-24T13:35:42.000Z");
    expect(zonedWallTimeToUtcIso(2026, 6, 24, 9, 30, 0)).toBe("2026-06-24T13:30:00.000Z");
  });

  it("maps Flex EST wall clock to UTC ISO", () => {
    // 2026-01-15 is EST (UTC-5)
    expect(flexDateTimeToUtcIso("20260115;093000")).toBe("2026-01-15T14:30:00.000Z");
  });

  it("reinterprets clock-as-UTC rows into real UTC without depending on process TZ", () => {
    expect(reinterpretUtcComponentsAsEastern("2026-06-24T09:35:42.000Z")).toBe(
      "2026-06-24T13:35:42.000Z",
    );
  });
});
