import { describe, expect, it } from "vitest";

import { computeScoreboard, rankScoreboard } from "./metrics";
import { POLICY_NAMES } from "./policyCatalog";
import type { PolicyId, ScoreboardRow } from "./types";

describe("computeScoreboard", () => {
  it("computes net R, win rate, profit factor, and max drawdown", () => {
    const row = computeScoreboard([1, -0.5, 2, -1, 0.5]);
    expect(row).toMatchObject({
      n: 5,
      netR: 2,
      wins: 3,
      losses: 2,
      winRate: 60,
    });
    expect(row!.profitFactor).toBeCloseTo(2.33, 1);
    expect(row!.maxDdR).toBe(1);
  });

  it("returns null profit factor when no losses but wins exist", () => {
    const row = computeScoreboard([1, 2]);
    expect(row!.profitFactor).toBeNull();
  });
});

describe("rankScoreboard", () => {
  it("sorts policies by net R descending", () => {
    const board = {
      actual: score(1),
      fixed_1r: score(3),
      fixed_2r: score(2),
      fixed_3r: score(0),
      be_only: score(0),
      half_be: score(0),
      half_trail: score(0),
      scale_3x: score(0),
      full_trail_tight: score(0),
      full_trail_wide: score(0),
      swing_harvest: score(0),
      step_trail_025: score(5),
      step_trail_05: score(4),
      step_trail_1: score(0),
    } satisfies Record<PolicyId, ScoreboardRow>;

    const ranked = rankScoreboard(board);
    expect(ranked[0]!.id).toBe("step_trail_025");
    expect(ranked[0]!.name).toBe(POLICY_NAMES.step_trail_025);
  });
});

function score(netR: number): ScoreboardRow {
  return {
    n: 1,
    netR,
    winRate: 100,
    wins: 1,
    losses: 0,
    avgWin: netR,
    avgLoss: 0,
    profitFactor: null,
    expectancy: netR,
    maxDdR: 0,
  };
}
