import { describe, expect, it } from "vitest";

import {
  buildPositionPlanJournalSnapshot,
  derivePlannedRiskFromPositionPlan,
  formatProtectSummaryFromPositionPlan,
  plannedRiskMatchesPositionPlanSnapshot,
  tradePlannedRiskIsEmpty,
} from "./journalRiskHandoff";
import { lockPositionPlan } from "./types";

describe("journalRiskHandoff", () => {
  const plan = lockPositionPlan({
    symbol: "AAPL",
    accountId: "DUP586813",
    side: "BUY",
    entry: 100,
    initialStop: 95,
    qty: 10,
    environment: "paper",
  });

  it("derives USD planned risk from position plan geometry", () => {
    expect(derivePlannedRiskFromPositionPlan(plan)).toEqual({ mode: "usd", value: 50 });
  });

  it("builds journal geometry snapshot", () => {
    expect(buildPositionPlanJournalSnapshot(plan)).toEqual({
      entry: 100,
      initialStop: 95,
      qty: 10,
      rUnit: 5,
      side: "BUY",
    });
  });

  it("formats protect summary from locked stop", () => {
    expect(formatProtectSummaryFromPositionPlan(plan)).toBe("Stop @ 95");
  });

  it("detects empty planned risk on trade", () => {
    expect(tradePlannedRiskIsEmpty({})).toBe(true);
    expect(
      tradePlannedRiskIsEmpty({ plannedRiskMode: "usd", plannedRiskValue: 50 }),
    ).toBe(false);
  });

  it("matches auto-filled planned risk to geometry snapshot", () => {
    expect(
      plannedRiskMatchesPositionPlanSnapshot(
        { plannedRiskMode: "usd", plannedRiskValue: 50 },
        buildPositionPlanJournalSnapshot(plan),
      ),
    ).toBe(true);
    expect(
      plannedRiskMatchesPositionPlanSnapshot(
        { plannedRiskMode: "usd", plannedRiskValue: 75 },
        buildPositionPlanJournalSnapshot(plan),
      ),
    ).toBe(false);
  });
});
