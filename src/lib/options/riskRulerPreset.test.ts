import { describe, it, expect } from "vitest";

import type { OptionContractSnapshot } from "@/lib/marketData/contracts/options";
import {
  priceOptionLeg,
  selectOptionPresetContracts,
  getOptionPresetSelectionStatus,
} from "@/lib/risk/optionPresetChain";
import {
  addRiskRulerPreset,
  addRiskRulerPresetFromCalc,
  buildOptionTradeSetup,
  buildOptionTradeSetupFromContracts,
  buildRiskRulerFromCalc,
  buildRiskRulerPreset,
  riskRulerCalcDrawingId,
  riskRulerPresetDrawingId,
  OPTION_SETUP_LABELS,
} from "@/lib/risk/createRiskRulerPreset";
import { formatOptionSetupExplanation, OPTION_SETUP_TYPES, validateTradeSetup } from "@edge/chart-core";

const EXPIRATION = "2025-06-20";
const SPOT = 150;

function contract(
  type: "call" | "put",
  strike: number,
  bid: number | null,
  ask: number | null,
  overrides?: Partial<OptionContractSnapshot>,
): OptionContractSnapshot {
  return {
    contractSymbol: `AAPL${EXPIRATION.replace(/-/g, "")}${type === "call" ? "C" : "P"}${String(strike).padStart(8, "0")}`,
    underlying: "AAPL",
    type,
    expiration: EXPIRATION,
    strike,
    bid,
    ask,
    updatedAt: Date.now(),
    ...overrides,
  };
}

function makeChain(): OptionContractSnapshot[] {
  const strikes = [140, 145, 150, 155, 160];
  const rows: OptionContractSnapshot[] = [];
  for (const strike of strikes) {
    const callBid = strike === 150 ? 1.0 : strike === 155 ? 0.7 : 0.25;
    const callAsk = strike === 150 ? 1.2 : strike === 155 ? 0.8 : 0.3;
    const putBid = strike === 150 ? 1.0 : strike === 145 ? 0.8 : 0.3;
    const putAsk = strike === 150 ? 1.1 : strike === 145 ? 0.9 : 0.35;
    rows.push(
      contract("call", strike, callBid, callAsk),
      contract("put", strike, putBid, putAsk),
    );
  }
  return rows;
}

describe("optionPresetChain", () => {
  it("prices buy legs from ask and sell legs from bid", () => {
    const call = contract("call", 150, 1.0, 1.2);
    expect(priceOptionLeg(call, "buy").premium).toBe(1.2);
    expect(priceOptionLeg(call, "sell").premium).toBe(1.0);
  });

  it("falls back to mark then last when bid/ask missing", () => {
    const call = contract("call", 150, null, null, { mark: 1.05, last: 1.08 });
    const priced = priceOptionLeg(call, "buy");
    expect(priced.premium).toBe(1.05);
    expect(priced.warning).toContain("mark");
  });

  it("selects long call at nearest ATM strike", () => {
    const selection = selectOptionPresetContracts("long_call", makeChain(), SPOT);
    expect(selection.ok).toBe(true);
    if (!selection.ok) return;
    expect(selection.legs).toHaveLength(1);
    expect(selection.legs[0]?.strike).toBe(150);
    expect(selection.legs[0]?.premium).toBe(1.2);
  });

  it("selects bull call spread legs with net debit", () => {
    const selection = selectOptionPresetContracts(
      "bull_call_debit_spread",
      makeChain(),
      SPOT,
    );
    expect(selection.ok).toBe(true);
    if (!selection.ok) return;
    expect(selection.legs.map((leg) => leg.strike)).toEqual([150, 155]);
  });

  it("selects bear put spread legs", () => {
    const selection = selectOptionPresetContracts(
      "bear_put_debit_spread",
      makeChain(),
      SPOT,
    );
    expect(selection.ok).toBe(true);
    if (!selection.ok) return;
    expect(selection.legs.map((leg) => leg.strike)).toEqual([150, 145]);
  });

  it("selects iron condor with four legs", () => {
    const selection = selectOptionPresetContracts("iron_condor", makeChain(), SPOT);
    expect(selection.ok).toBe(true);
    if (!selection.ok) return;
    expect(selection.legs).toHaveLength(4);
    expect(selection.legs.map((leg) => leg.strike)).toEqual([145, 140, 155, 160]);
  });

  it("returns reason when chain is empty", () => {
    const status = getOptionPresetSelectionStatus("long_call", [], SPOT);
    expect(status.ok).toBe(false);
    if (status.ok) return;
    expect(status.reason).toBe("Options chain not loaded");
  });
});

describe("createRiskRulerPreset", () => {
  const symbol = "AAPL";
  const timestamp = 1_700_000_000_000;
  const dataIndex = 42;

  it("returns null for invalid spot price", () => {
    expect(
      buildRiskRulerPreset({
        setupType: "long_call",
        spotPrice: 0,
        symbol,
      }),
    ).toBeNull();
  });

  it("builds a validated long call setup from spot", () => {
    const setup = buildOptionTradeSetup({
      setupType: "long_call",
      spotPrice: 100,
      symbol,
    });
    expect(setup).not.toBeNull();
    expect(setup?.instrument).toBe("option");
    expect(setup?.setupType).toBe("long_call");
    expect(setup?.direction).toBe("long");
    expect(setup?.entries[0]?.price).toBe(100);
    expect(setup?.stops[0]?.price).toBeLessThan(100);
    expect(setup?.targets).toHaveLength(3);
    expect(setup?.legs).toHaveLength(1);
    expect(setup?.legs?.[0]?.type).toBe("call");
    expect(setup?.breakevens).toEqual([102]);
  });

  it("builds long call from chain with real premium and breakeven", () => {
    const result = buildOptionTradeSetupFromContracts({
      setupType: "long_call",
      spotPrice: SPOT,
      symbol,
      contracts: makeChain(),
    });
    expect(result).not.toBeNull();
    expect(result?.setup.maxLoss).toBe(1.2);
    expect(result?.setup.breakevens).toEqual([151.2]);
    expect(result?.setup.legs?.[0]?.premium).toBe(1.2);
  });

  it("builds bull call debit spread from chain with defined max profit", () => {
    const result = buildOptionTradeSetupFromContracts({
      setupType: "bull_call_debit_spread",
      spotPrice: SPOT,
      symbol,
      contracts: makeChain(),
    });
    expect(result).not.toBeNull();
    expect(result?.setup.maxLoss).toBe(0.5);
    expect(result?.setup.maxProfit).toBe(4.5);
    expect(result?.setup.breakevens).toEqual([150.5]);
  });

  it("builds bear put debit spread as short direction from chain", () => {
    const result = buildOptionTradeSetupFromContracts({
      setupType: "bear_put_debit_spread",
      spotPrice: SPOT,
      symbol,
      contracts: makeChain(),
    });
    expect(result?.setup.direction).toBe("short");
    expect(result?.setup.maxLoss).toBe(0.3);
    expect(result?.setup.breakevens).toEqual([149.7]);
  });

  it("builds iron condor from chain with two breakevens", () => {
    const result = buildOptionTradeSetupFromContracts({
      setupType: "iron_condor",
      spotPrice: SPOT,
      symbol,
      contracts: makeChain(),
      expiration: EXPIRATION,
    });
    expect(result?.setup.legs).toHaveLength(4);
    expect(result?.setup.breakevens).toHaveLength(2);
    expect(result?.setup.maxProfit).toBeGreaterThan(0);
  });

  it("creates chain-derived risk_ruler drawing metadata", () => {
    const drawing = buildRiskRulerPreset({
      setupType: "long_call",
      spotPrice: SPOT,
      symbol,
      contracts: makeChain(),
      timestamp,
      dataIndex,
    });
    expect(drawing).not.toBeNull();
    expect(drawing?.name).toBe("risk_ruler");
    expect(drawing?.id).toBe(riskRulerPresetDrawingId("long_call", symbol));
    expect(drawing?.metadata?.computed?.chainDerived).toBe(true);
    const riskSetup = drawing?.metadata?.fields?.riskSetup as {
      setupType?: string;
      symbol?: string;
      maxLoss?: number;
    };
    expect(riskSetup.setupType).toBe("long_call");
    expect(riskSetup.symbol).toBe("AAPL");
    expect(riskSetup.maxLoss).toBe(1.2);
    expect(drawing?.metadata?.computed?.direction).toBe("long");
    expect(typeof drawing?.metadata?.computed?.positionSize).toBe("number");
    const expectedSetup = buildOptionTradeSetup({
      setupType: "long_call",
      spotPrice: SPOT,
      symbol,
      contracts: makeChain(),
    });
    expect(drawing?.metadata?.fields?.optionExplanation).toEqual(
      formatOptionSetupExplanation(expectedSetup!),
    );
    expect(drawing?.metadata?.computed?.instrument).toBe("option");
  });

  it("falls back to spot estimate when chain selection fails", () => {
    const drawing = buildRiskRulerPreset({
      setupType: "long_call",
      spotPrice: 100,
      symbol,
      contracts: [],
    });
    expect(drawing?.metadata?.computed?.chainDerived).toBeFalsy();
    expect(drawing?.metadata?.fields?.riskSetup).toBeTruthy();
  });

  it("replaces an existing preset drawing for the same setup type", () => {
    const first = buildRiskRulerPreset({
      setupType: "long_call",
      spotPrice: 100,
      symbol,
    });
    const merged = addRiskRulerPreset(first ? [first] : [], {
      setupType: "long_call",
      spotPrice: 110,
      symbol,
    });
    expect(merged).toHaveLength(1);
    expect(merged[0]?.points[0]?.value).toBe(110);
  });

  it("includes pricing warnings when mark/last fallback is used", () => {
    const chain = [
      contract("call", 150, null, null, { mark: 1.05 }),
    ];
    const drawing = buildRiskRulerPreset({
      setupType: "long_call",
      spotPrice: SPOT,
      symbol,
      contracts: chain,
    });
    const warnings = drawing?.metadata?.fields?.pricingWarnings as string[] | undefined;
    expect(warnings?.length).toBeGreaterThan(0);
  });

  it("builds calculator-derived long call risk ruler with user stop and target", () => {
    const drawing = buildRiskRulerFromCalc({
      direction: "bullish",
      spotPrice: 100,
      symbol: "AAPL",
      strike: 105,
      premium: 2.3,
      stop: 95,
      target: 110,
      expiration: EXPIRATION,
    });
    expect(drawing).not.toBeNull();
    expect(drawing?.id).toBe(riskRulerCalcDrawingId("AAPL", 105));
    expect(drawing?.points.map((point) => point.value)).toEqual([100, 95, 110]);
    expect(drawing?.metadata?.computed?.calculatorDerived).toBe(true);
  });

  it("builds calculator-derived long put risk ruler", () => {
    const drawing = buildRiskRulerFromCalc({
      direction: "bearish",
      spotPrice: 100,
      symbol: "AAPL",
      strike: 95,
      premium: 2.1,
      stop: 105,
      target: 90,
      expiration: EXPIRATION,
    });
    expect(drawing).not.toBeNull();
    expect(drawing?.metadata?.fields?.riskSetup).toMatchObject({
      direction: "short",
    });
    expect(drawing?.points.map((point) => point.value)).toEqual([100, 105, 90]);
  });

  it("adds calculator risk ruler without disturbing unrelated drawings", () => {
    const existing = buildRiskRulerPreset({
      setupType: "long_call",
      spotPrice: 100,
      symbol: "AAPL",
    });
    const merged = addRiskRulerPresetFromCalc(existing ? [existing] : [], {
      direction: "bullish",
      spotPrice: 100,
      symbol: "AAPL",
      strike: 105,
      premium: 2.3,
      stop: 95,
      target: 110,
      expiration: EXPIRATION,
    });
    expect(merged).toHaveLength(2);
  });
});

describe("OPTION_SETUP_LABELS", () => {
  it("has labels for all setup types", () => {
    expect(OPTION_SETUP_LABELS.long_call).toBe("Long Call");
    expect(OPTION_SETUP_LABELS.iron_condor).toBe("Iron Condor");
  });
});

describe("all quick risk ruler presets", () => {
  const symbol = "AAPL";
  const chain = makeChain();

  it.each(OPTION_SETUP_TYPES)(
    "builds a validated chain-derived risk_ruler for %s",
    (setupType) => {
      const selection = selectOptionPresetContracts(setupType, chain, SPOT);
      expect(selection.ok).toBe(true);

      const fromContracts = buildOptionTradeSetupFromContracts({
        setupType,
        spotPrice: SPOT,
        symbol,
        contracts: chain,
      });
      expect(fromContracts).not.toBeNull();
      expect(() => validateTradeSetup(fromContracts!.setup)).not.toThrow();

      const drawing = buildRiskRulerPreset({
        setupType,
        spotPrice: SPOT,
        symbol,
        contracts: chain,
      });
      expect(drawing?.name).toBe("risk_ruler");
      expect(drawing?.metadata?.computed?.chainDerived).toBe(true);
      expect(drawing?.metadata?.computed?.instrument).toBe("option");
      expect(drawing?.points.length).toBeGreaterThanOrEqual(3);
      expect(typeof drawing?.metadata?.computed?.positionSize).toBe("number");

      const status = getOptionPresetSelectionStatus(setupType, chain, SPOT);
      expect(status.ok).toBe(true);
      if (status.ok) {
        expect(status.preview.length).toBeGreaterThan(0);
      }
    },
  );

  it("uses explicit account capital when provided to buildRiskRulerPreset", () => {
    const drawing = buildRiskRulerPreset({
      setupType: "long_call",
      spotPrice: SPOT,
      symbol: "AAPL",
      contracts: makeChain(),
      account: { capital: 200_000, riskPercent: 2 },
    });
    const setup = drawing?.metadata?.fields?.riskSetup as
      | { account?: { capital: number } }
      | undefined;
    expect(setup?.account?.capital).toBe(200_000);
  });
});
