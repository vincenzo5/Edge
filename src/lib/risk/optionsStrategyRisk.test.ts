import { describe, expect, it } from "vitest";
import type { OptionContractSnapshot } from "@/lib/marketData/contracts/options";
import {
  blackScholesPrice,
  buildContractMap,
  buildExitDates,
  buildTargetPrices,
  findContractForLeg,
  legFromContract,
  listStrikesForLeg,
  nearestChainStrike,
  sizeContractsFromRisk,
  strategyValueAtScenario,
  validateAndEvaluateStrategy,
  type ResolvedLeg,
  type StrategyLegInput,
} from "./optionsStrategyRisk";

const EXPIRATION = "2026-07-10";
const NOW = new Date("2026-07-02T12:00:00.000Z");

function contract(
  type: "call" | "put",
  strike: number,
  overrides?: Partial<OptionContractSnapshot>,
): OptionContractSnapshot {
  return {
    contractSymbol: `LLY${type}${strike}`,
    underlying: "LLY",
    type,
    expiration: EXPIRATION,
    strike,
    bid: 3.5,
    ask: 5.2,
    mark: 4.35,
    last: 4.35,
    volume: 100,
    openInterest: 500,
    impliedVolatility: 0.35,
    delta: type === "call" ? 0.2 : -0.2,
    updatedAt: Date.now(),
    ...overrides,
  };
}

function baseInputs(overrides?: Record<string, unknown>) {
  return {
    symbol: "LLY",
    spotPrice: 1212,
    maxRisk: 4000,
    entryPriceMode: "mid" as const,
    exitPriceMode: "bid" as const,
    ivScenario: "unchanged" as const,
    legs: [legFromContract(contract("call", 1280))],
    ...overrides,
  };
}

describe("blackScholesPrice", () => {
  it("returns intrinsic value at expiration", () => {
    expect(blackScholesPrice({ type: "call", spot: 1300, strike: 1280, daysToExpiration: 0, iv: 0.35 })).toBe(20);
    expect(blackScholesPrice({ type: "put", spot: 1200, strike: 1280, daysToExpiration: 0, iv: 0.35 })).toBe(80);
  });

  it("returns positive time value before expiration", () => {
    const premium = blackScholesPrice({
      type: "call",
      spot: 1280,
      strike: 1280,
      daysToExpiration: 4,
      iv: 0.35,
    });
    expect(premium).toBeGreaterThan(0);
  });
});

describe("buildExitDates", () => {
  it("includes expiration and prior days", () => {
    const dates = buildExitDates("2026-07-10", NOW);
    expect(dates).toContain("2026-07-10");
    expect(dates.length).toBeGreaterThan(1);
  });
});

describe("sizeContractsFromRisk", () => {
  it("floors contracts from max risk and per-unit max loss", () => {
    expect(sizeContractsFromRisk(4000, 4.38)).toBe(9);
  });
});

describe("validateAndEvaluateStrategy", () => {
  it("evaluates a long call with auto sizing and payoff grid", () => {
    const contracts = [contract("call", 1280)];
    const result = validateAndEvaluateStrategy({
      inputs: baseInputs(),
      contractsByKey: buildContractMap(contracts),
      now: NOW,
    });

    expect(result.ok).toBe(true);
    expect(result.summary?.contracts).toBe(9);
    expect(result.summary?.maxLoss).toBe(3915);
    expect(result.grid?.cells.length).toBeGreaterThan(0);
    expect(result.grid?.exitDates).toContain("2026-07-10");
  });

  it("blocks when entry price is missing", () => {
    const contracts = [contract("call", 1280, { bid: null, ask: null, mark: null, last: null })];
    const result = validateAndEvaluateStrategy({
      inputs: baseInputs({ entryPriceMode: "ask" }),
      contractsByKey: buildContractMap(contracts),
      now: NOW,
    });

    expect(result.ok).toBe(false);
    expect(result.hardIssues.some((issue) => issue.message.includes("Missing entry price"))).toBe(
      true,
    );
  });

  it("warns for low volume and wide spread", () => {
    const contracts = [
      contract("call", 1280, { volume: 2, bid: 1, ask: 3, mark: 2 }),
    ];
    const result = validateAndEvaluateStrategy({
      inputs: baseInputs(),
      contractsByKey: buildContractMap(contracts),
      now: NOW,
    });

    expect(result.softIssues.some((issue) => issue.message.includes("Low volume"))).toBe(true);
    expect(result.softIssues.some((issue) => issue.message.includes("Wide spread"))).toBe(true);
  });

  it("supports manual contract sizing for undefined-risk strategies", () => {
    const contracts = [contract("call", 1280)];
    const result = validateAndEvaluateStrategy({
      inputs: baseInputs({
        legs: [legFromContract(contract("call", 1280), "sell", 1)],
        manualContracts: 2,
      }),
      contractsByKey: buildContractMap(contracts),
      now: NOW,
    });

    expect(result.summary?.sizingMode).toBe("manual");
    expect(result.summary?.contracts).toBe(2);
    expect(result.softIssues.some((issue) => issue.message.includes("Naked short"))).toBe(true);
  });

  it("evaluates a bull call debit spread with defined max loss", () => {
    const contracts = [contract("call", 1280), contract("call", 1320, { ask: 2.0, bid: 1.8, mark: 1.9 })];
    const result = validateAndEvaluateStrategy({
      inputs: baseInputs({
        legs: [
          legFromContract(contract("call", 1280), "buy", 1),
          legFromContract(contract("call", 1320, { ask: 2.0, bid: 1.8, mark: 1.9 }), "sell", 1),
        ],
      }),
      contractsByKey: buildContractMap(contracts),
      now: NOW,
    });

    expect(result.ok).toBe(true);
    expect(result.summary?.maxLoss).toBeGreaterThan(0);
    expect(result.summary?.maxProfit).not.toBeNull();
  });

  it("returns expiration payoff of zero when OTM at strike", () => {
    const legs: ResolvedLeg[] = [
      {
        id: "1",
        action: "buy",
        type: "call",
        expiration: EXPIRATION,
        strike: 1340,
        quantity: 24,
        entryPremium: 1.67,
        impliedVolatility: 0.35,
        contractSymbol: "C1340",
      },
    ];
    const value = strategyValueAtScenario(legs, 1340, 0, "unchanged");
    expect(value).toBe(0);
  });
});

describe("buildTargetPrices", () => {
  it("includes spot and strikes", () => {
    const legs: StrategyLegInput[] = [legFromContract(contract("call", 1280))];
    const prices = buildTargetPrices(1212, legs);
    expect(prices).toContain(1212);
    expect(prices).toContain(1280);
  });
});

describe("chain selection helpers", () => {
  const chain = [
    contract("call", 1210),
    contract("call", 1215),
    contract("call", 1220),
    contract("put", 1210),
    contract("put", 1215),
  ];

  it("lists sorted strikes for type and expiration", () => {
    expect(listStrikesForLeg(chain, { type: "call", expiration: EXPIRATION })).toEqual([
      1210, 1215, 1220,
    ]);
  });

  it("finds contract by leg query", () => {
    const found = findContractForLeg(chain, {
      type: "call",
      expiration: EXPIRATION,
      strike: 1215,
    });
    expect(found?.contractSymbol).toBe("LLYcall1215");
  });

  it("picks nearest strike for non-round spot", () => {
    expect(
      nearestChainStrike(chain, { type: "call", expiration: EXPIRATION, spot: 1213.91 }),
    ).toBe(1215);
  });

  it("keeps requested strike when listed", () => {
    expect(
      nearestChainStrike(chain, {
        type: "call",
        expiration: EXPIRATION,
        spot: 1213.91,
        strike: 1210,
      }),
    ).toBe(1210);
  });
});
