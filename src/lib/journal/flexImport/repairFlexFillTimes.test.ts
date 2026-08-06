import { describe, expect, it } from "vitest";

import {
  isLikelyWrongFlexUtcImport,
  planFlexFillTimeRepair,
} from "@/lib/journal/flexImport/repairFlexFillTimes";

describe("repairFlexFillTimes", () => {
  it("detects classic RTH-open-as-UTC rows", () => {
    expect(isLikelyWrongFlexUtcImport("2026-06-24T09:30:00.000Z")).toBe(true);
    expect(isLikelyWrongFlexUtcImport("2026-06-24T13:30:00.000Z")).toBe(false);
  });

  it("plans heuristic repairs and skips live fills", () => {
    const plans = planFlexFillTimeRepair([
      {
        execId: "flex-1",
        fillTime: "2026-06-24T09:35:42.000Z",
        source: "flex_csv",
      },
      {
        execId: "live-1",
        fillTime: "2026-08-05T18:35:35.000Z",
        source: "live",
      },
      {
        execId: "flex-ok",
        fillTime: "2026-06-24T13:35:42.000Z",
        source: "flex_csv",
      },
    ]);
    expect(plans).toHaveLength(1);
    expect(plans[0]).toMatchObject({
      execId: "flex-1",
      toIso: "2026-06-24T13:35:42.000Z",
      reason: "heuristic_et_hour_band",
    });
  });

  it("all-flex mode repairs every flex_csv row once; state skips re-run", () => {
    const rows = [
      {
        execId: "flex-1",
        fillTime: "2026-06-24T09:35:42.000Z",
        source: "flex_csv" as const,
      },
      {
        execId: "flex-2",
        fillTime: "2026-06-24T14:00:00.000Z",
        source: "flex_csv" as const,
      },
    ];
    const first = planFlexFillTimeRepair(rows, { allFlex: true });
    expect(first).toHaveLength(2);

    const second = planFlexFillTimeRepair(
      [
        { ...rows[0]!, fillTime: first[0]!.toIso },
        { ...rows[1]!, fillTime: first[1]!.toIso },
      ],
      {
        allFlex: true,
        alreadyRepairedExecIds: new Set(first.map((plan) => plan.execId)),
      },
    );
    expect(second).toHaveLength(0);
  });
});
