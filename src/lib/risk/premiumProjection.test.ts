import { describe, expect, it } from "vitest";
import type { OptionContractSnapshot } from "@/lib/marketData/contracts/options";
import type { StrikeRow } from "@/lib/options/optionsClient";
import {
  computeStrikeEvaluation,
  estimatePremiumAtTarget,
  evaluateThreeStrikes,
  filterExpirationsForHold,
  isLiquidityOk,
  pickWinner,
  selectThreeStrikes,
  sizeContracts,
  validateCalculatorInputs,
} from "./premiumProjection";

const EXPIRATION = "2026-07-15";

function contract(
  type: "call" | "put",
  strike: number,
  overrides?: Partial<OptionContractSnapshot>,
): OptionContractSnapshot {
  return {
    contractSymbol: `AAPL${type}${strike}`,
    underlying: "AAPL",
    type,
    expiration: EXPIRATION,
    strike,
    bid: 2.0,
    ask: 2.2,
    mark: 2.1,
    volume: 500,
    delta: type === "call" ? 0.45 : -0.45,
    updatedAt: Date.now(),
    ...overrides,
  };
}

function row(strike: number, callOverrides?: Partial<OptionContractSnapshot>, putOverrides?: Partial<OptionContractSnapshot>): StrikeRow {
  return {
    strike,
    call: contract("call", strike, callOverrides),
    put: contract("put", strike, putOverrides),
  };
}

const NOW = new Date("2026-07-01T12:00:00.000Z");

function validInputs(overrides?: Partial<Record<string, unknown>>) {
  return {
    direction: "bullish" as const,
    spotPrice: 100,
    target: 110,
    stop: 95,
    maxRisk: 1000,
    maxHoldDays: 5,
    expiration: "2026-07-11",
    ...overrides,
  };
}

describe("estimatePremiumAtTarget", () => {
  it("projects bullish call premium with delta", () => {
    const c = contract("call", 100, { delta: 0.5, ask: 2.0, bid: 1.8 });
    const result = estimatePremiumAtTarget(c, 100, 110, "bullish");
    expect(result.premiumAtTarget).toBe(7);
    expect(result.deltaEstimate).toBe(true);
  });

  it("projects bearish put premium with absolute delta", () => {
    const c = contract("put", 100, { delta: -0.4, ask: 1.5, bid: 1.3 });
    const result = estimatePremiumAtTarget(c, 100, 90, "bearish");
    expect(result.premiumAtTarget).toBe(5.5);
  });

  it("clamps negative projection to zero", () => {
    const c = contract("call", 110, { delta: 0.1, ask: 0.5, bid: 0.4 });
    const result = estimatePremiumAtTarget(c, 100, 95, "bullish");
    expect(result.premiumAtTarget).toBe(0);
  });

  it("falls back to current premium when delta missing", () => {
    const c = contract("call", 100, { delta: null, ask: 2.5, bid: 2.3 });
    const result = estimatePremiumAtTarget(c, 100, 110, "bullish");
    expect(result.premiumAtTarget).toBe(2.5);
    expect(result.deltaEstimate).toBe(false);
  });
});

describe("selectThreeStrikes", () => {
  const rows = [90, 95, 100, 105, 110, 115].map((strike) => row(strike));

  it("selects ATM, halfway, and target strikes for bullish", () => {
    const three = selectThreeStrikes(rows, 100, 110, "bullish");
    expect(three).toEqual({ atm: 100, halfway: 105, target: 110 });
  });

  it("selects strikes for bearish move", () => {
    const three = selectThreeStrikes(rows, 100, 90, "bearish");
    expect(three).toEqual({ atm: 100, halfway: 95, target: 90 });
  });

  it("snaps to nearest available strike", () => {
    const sparse = [98, 103, 108].map((strike) => row(strike));
    const three = selectThreeStrikes(sparse, 100, 110, "bullish");
    expect(three).toEqual({ atm: 98, halfway: 103, target: 108 });
  });

  it("returns null when no priced legs exist", () => {
    const empty = [{ strike: 100 }];
    expect(selectThreeStrikes(empty, 100, 110, "bullish")).toBeNull();
  });

  it("returns null when fewer than three distinct strikes are available", () => {
    const sparse = [115, 118].map((strike) => row(strike));
    expect(selectThreeStrikes(sparse, 115.5, 118, "bullish")).toBeNull();
  });

  it("picks three distinct strikes when ATM and halfway would otherwise collide", () => {
    const rows = [114, 115, 116, 117, 118].map((strike) => row(strike));
    const three = selectThreeStrikes(rows, 115.5, 118, "bullish");
    expect(three).not.toBeNull();
    expect(three!.atm).not.toBe(three!.halfway);
    expect(three!.atm).not.toBe(three!.target);
    expect(three!.halfway).not.toBe(three!.target);
    expect(three).toEqual({ atm: 115, halfway: 117, target: 118 });
  });
});

describe("computeStrikeEvaluation", () => {
  it("computes ratio and budget fit", () => {
    const evaluation = computeStrikeEvaluation(row(105), "bullish", 100, 110, 1000);
    expect(evaluation).not.toBeNull();
    expect(evaluation!.strike).toBe(105);
    expect(evaluation!.premium).toBe(2.2);
    expect(evaluation!.ratio).toBeGreaterThan(0);
    expect(evaluation!.fitsRiskBudget).toBe(true);
    expect(evaluation!.liquidityOk).toBe(true);
  });

  it("marks over-budget when premium exceeds max risk", () => {
    const evaluation = computeStrikeEvaluation(
      row(100, { ask: 15, bid: 14.5, volume: 500 }),
      "bullish",
      100,
      110,
      1000,
    );
    expect(evaluation!.fitsRiskBudget).toBe(false);
  });

  it("marks deltaEstimate false when delta is missing", () => {
    const evaluation = computeStrikeEvaluation(
      row(105, { delta: null }),
      "bullish",
      100,
      110,
      1000,
    );
    expect(evaluation).not.toBeNull();
    expect(evaluation!.deltaEstimate).toBe(false);
    expect(evaluation!.profit).toBe(0);
    expect(evaluation!.ratio).toBe(0);
  });
});

describe("pickWinner", () => {
  it("returns highest ratio among liquid in-budget strikes", () => {
    const evaluations = [
      {
        strike: 100,
        premium: 4,
        premiumAtTarget: 6,
        profit: 2,
        ratio: 0.5,
        delta: 0.5,
        volume: 100,
        bidAskSpread: 0.1,
        liquidityOk: true,
        fitsRiskBudget: true,
        deltaEstimate: true,
      },
      {
        strike: 105,
        premium: 2,
        premiumAtTarget: 6,
        profit: 4,
        ratio: 2,
        delta: 0.4,
        volume: 200,
        bidAskSpread: 0.1,
        liquidityOk: true,
        fitsRiskBudget: true,
        deltaEstimate: true,
      },
      {
        strike: 110,
        premium: 1,
        premiumAtTarget: 4,
        profit: 3,
        ratio: 3,
        delta: 0.2,
        volume: 0,
        bidAskSpread: 0.5,
        liquidityOk: false,
        fitsRiskBudget: true,
        deltaEstimate: true,
      },
    ];
    expect(pickWinner(evaluations)?.strike).toBe(105);
  });

  it("returns null when all filtered out", () => {
    expect(
      pickWinner([
        {
          strike: 110,
          premium: 1,
          premiumAtTarget: 1,
          profit: 0,
          ratio: 0,
          delta: 0.1,
          volume: 0,
          bidAskSpread: null,
          liquidityOk: false,
          fitsRiskBudget: false,
          deltaEstimate: true,
        },
      ]),
    ).toBeNull();
  });
});

describe("sizeContracts", () => {
  it("floors contracts from max risk and premium", () => {
    expect(sizeContracts(1000, 2.3)).toBe(4);
  });

  it("returns zero when premium exceeds max risk", () => {
    expect(sizeContracts(100, 2.5)).toBe(0);
  });
});

describe("isLiquidityOk", () => {
  it("rejects low volume", () => {
    expect(isLiquidityOk(contract("call", 100, { volume: 5 }))).toBe(false);
  });

  it("rejects wide spread", () => {
    expect(
      isLiquidityOk(contract("call", 100, { bid: 1, ask: 2, volume: 1000 })),
    ).toBe(false);
  });
});

describe("filterExpirationsForHold", () => {
  const expirations = ["2026-07-06", "2026-07-11", "2026-07-20", "2026-08-01"];

  it("keeps expirations within hold window", () => {
    expect(filterExpirationsForHold(expirations, 5, NOW)).toEqual(["2026-07-11"]);
  });
});

describe("validateCalculatorInputs", () => {
  it("accepts valid bullish inputs", () => {
    const result = validateCalculatorInputs(validInputs(), NOW);
    expect(result.ok).toBe(true);
    expect(result.hardIssues).toHaveLength(0);
  });

  it("blocks bullish stop above spot", () => {
    const result = validateCalculatorInputs(validInputs({ stop: 101 }), NOW);
    expect(result.ok).toBe(false);
    expect(result.hardIssues.some((issue) => issue.field === "stop")).toBe(true);
  });

  it("blocks bearish stop below spot", () => {
    const result = validateCalculatorInputs(
      validInputs({ direction: "bearish", target: 90, stop: 99 }),
      NOW,
    );
    expect(result.ok).toBe(false);
  });

  it("blocks equal target and stop", () => {
    const result = validateCalculatorInputs(validInputs({ target: 95, stop: 95 }), NOW);
    expect(result.ok).toBe(false);
    expect(result.hardIssues[0]?.message).toContain("equal");
  });

  it("allows soft warnings without blocking", () => {
    const result = validateCalculatorInputs(
      validInputs({ target: 125, expiration: "2026-07-20" }),
      NOW,
    );
    expect(result.ok).toBe(true);
    expect(result.softIssues.length).toBeGreaterThan(0);
  });

  it("blocks expiration inside hold window", () => {
    const result = validateCalculatorInputs(validInputs({ expiration: "2026-07-05" }), NOW);
    expect(result.ok).toBe(false);
    expect(result.hardIssues.some((issue) => issue.field === "expiration")).toBe(true);
  });
});

describe("evaluateThreeStrikes", () => {
  it("returns sorted evaluations for the three strikes", () => {
    const rows = [100, 105, 110].map((strike) => row(strike));
    const three = { atm: 100, halfway: 105, target: 110 };
    const evaluations = evaluateThreeStrikes(rows, three, "bullish", 100, 110, 5000);
    expect(evaluations).toHaveLength(3);
    expect(evaluations[0]!.ratio).toBeGreaterThanOrEqual(evaluations[1]!.ratio);
  });
});
