import { describe, expect, it } from "vitest";
import {
  createPlaybookInstance,
  lockPositionPlan,
} from "@/lib/trading/playbook/types";
import { getPlaybookPreset } from "@/lib/trading/playbook/presets";
import type { PlaybookInstance } from "@/lib/trading/playbook/types";
import { DEFAULT_RISK_SETTINGS } from "./riskSettings";
import {
  accountGateBlockReasons,
  buildAccountGateEvaluationInput,
  evaluateAccountRiskGates,
  formatDayLossGateLine,
  formatOpenHeatGateLine,
  isRiskIncreasingEntry,
  sumOpenHeatFromPlaybookInstances,
} from "./accountRiskGates";

function playbookInstance(overrides: Partial<PlaybookInstance> = {}): PlaybookInstance {
  const template = getPlaybookPreset("break_even")!;
  const positionPlan = lockPositionPlan({
    symbol: "AAPL",
    accountId: "DUP586813",
    side: "BUY",
    entry: 100,
    initialStop: 95,
    qty: 100,
    environment: "paper",
  });
  return {
    ...createPlaybookInstance({
      id: "pb-1",
      template,
      positionPlan,
      status: "armed",
    }),
    ...overrides,
  };
}

describe("accountRiskGates", () => {
  it("sums open heat from active playbook PositionPlans", () => {
    const instances = [
      playbookInstance(),
      playbookInstance({
        id: "pb-2",
        positionPlan: lockPositionPlan({
          symbol: "MSFT",
          accountId: "DUP586813",
          side: "BUY",
          entry: 200,
          initialStop: 190,
          qty: 50,
          environment: "paper",
        }),
      }),
      playbookInstance({ id: "pb-3", status: "detached" }),
    ];
    expect(sumOpenHeatFromPlaybookInstances(instances)).toEqual({
      heatDollars: 500 + 500,
      trackedPlans: 2,
    });
  });

  it("flags day-loss breach at cap", () => {
    const status = evaluateAccountRiskGates({
      settings: { ...DEFAULT_RISK_SETTINGS, periodLossCapPercent: 3 },
      netLiquidation: 100_000,
      dailyPnL: -3_100,
      openHeatDollars: 0,
    });
    expect(status.dayLoss.breached).toBe(true);
    expect(status.dayLoss.nearCap).toBe(false);
    expect(accountGateBlockReasons(status)).toHaveLength(1);
    expect(accountGateBlockReasons(status)[0]).toMatch(/Daily loss cap/);
  });

  it("flags open heat breach with proposed trade risk", () => {
    const status = evaluateAccountRiskGates({
      settings: { ...DEFAULT_RISK_SETTINGS, openHeatCapPercent: 5 },
      netLiquidation: 100_000,
      dailyPnL: 0,
      openHeatDollars: 4_000,
      proposedRiskDollars: 2_000,
    });
    expect(status.openHeat.breached).toBe(true);
    expect(
      accountGateBlockReasons(status, { proposedRiskDollars: 2_000 }),
    ).toMatchObject([expect.stringMatching(/Open heat cap/)]);
  });

  it("treats BUY as risk-increasing entry", () => {
    expect(
      isRiskIncreasingEntry(
        {
          accountId: "DUP586813",
          symbol: "AAPL",
          side: "BUY",
          quantity: 10,
          orderType: "MKT",
          environment: "paper",
        },
        [],
      ),
    ).toBe(true);
    expect(
      isRiskIncreasingEntry(
        {
          accountId: "DUP586813",
          symbol: "AAPL",
          side: "SELL",
          quantity: 10,
          orderType: "MKT",
          environment: "paper",
        },
        [],
      ),
    ).toBe(false);
  });

  it("formats gate measurement lines", () => {
    const status = evaluateAccountRiskGates({
      settings: {
        ...DEFAULT_RISK_SETTINGS,
        periodLossCapPercent: 3,
        openHeatCapPercent: 6,
      },
      netLiquidation: 100_000,
      dailyPnL: -1_500,
      openHeatDollars: 4_000,
      openPositionCount: 2,
      trackedPlanCount: 1,
    });
    expect(formatDayLossGateLine(status.dayLoss)).toMatch(/Day P&L/);
    expect(formatOpenHeatGateLine(status.openHeat)).toMatch(/untracked/);
  });

  it("builds evaluation input from account snapshot", () => {
    const input = buildAccountGateEvaluationInput({
      settings: { ...DEFAULT_RISK_SETTINGS, openHeatCapPercent: 6 },
      accountSummary: {
        tags: { NetLiquidation: { tag: "NetLiquidation", value: "100000" } },
      },
      pnl: { dailyPnL: -500 },
      playbookInstances: [playbookInstance()],
      openPositionCount: 1,
      proposedRiskDollars: 250,
    });
    expect(input.netLiquidation).toBe(100_000);
    expect(input.openHeatDollars).toBe(500);
    expect(input.dailyPnL).toBe(-500);
  });
});
