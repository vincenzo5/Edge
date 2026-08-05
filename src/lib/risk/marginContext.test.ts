import { describe, expect, it } from "vitest";
import {
  classifyMarginStatus,
  classifyUtilizationStatus,
  computeMarginBarSegments,
  computeMarginImpact,
  computeMaxAffordableShares,
  estimateMarginImpactFromNotional,
  formatHoldToStopSummary,
  formatMarginUtilRange,
  formatUtilizationPercent,
  marginStatusBarColor,
  marginStatusPlainLabel,
  marginStatusTextClass,
  parseMarginSnapshot,
  projectHoldToStop,
  resolveIbkrStockMarginRates,
  resolveMarginImpact,
} from "./marginContext";

describe("parseMarginSnapshot", () => {
  it("reads margin tags and computes utilization", () => {
    const snapshot = parseMarginSnapshot({
      NetLiquidation: { tag: "NetLiquidation", value: "100000" },
      InitMarginReq: { tag: "InitMarginReq", value: "62000" },
      MaintMarginReq: { tag: "MaintMarginReq", value: "50000" },
      AvailableFunds: { tag: "AvailableFunds", value: "41000" },
      ExcessLiquidity: { tag: "ExcessLiquidity", value: "38000" },
    });

    expect(snapshot.netLiquidation).toBe(100000);
    expect(snapshot.initMarginReq).toBe(62000);
    expect(snapshot.utilization).toBeCloseTo(0.62);
  });

  it("returns null utilization when net liquidation is zero", () => {
    const snapshot = parseMarginSnapshot({
      NetLiquidation: { tag: "NetLiquidation", value: "0" },
      InitMarginReq: { tag: "InitMarginReq", value: "1000" },
    });
    expect(snapshot.utilization).toBeNull();
  });
});

describe("computeMarginImpact", () => {
  const current = parseMarginSnapshot({
    NetLiquidation: { tag: "NetLiquidation", value: "100000" },
    InitMarginReq: { tag: "InitMarginReq", value: "62000" },
    ExcessLiquidity: { tag: "ExcessLiquidity", value: "38000" },
  });

  it("projects utilization and headroom after what-if", () => {
    const impact = computeMarginImpact(current, {
      initMarginChange: 4200,
      maintMarginChange: 3500,
      warningText: null,
    });

    expect(impact.initMarginChange).toBe(4200);
    expect(impact.projectedUtilization).toBeCloseTo(0.662);
    expect(impact.headroomAfter).toBe(34500);
  });

  it("does not add back negative maint margin change to headroom", () => {
    const impact = computeMarginImpact(current, {
      initMarginChange: -1000,
      maintMarginChange: -500,
      warningText: null,
    });

    expect(impact.headroomAfter).toBe(38000);
    expect(impact.estimated).toBe(false);
  });
});

describe("resolveIbkrStockMarginRates", () => {
  it("uses Reg T 50% init and 25% maint for longs", () => {
    expect(resolveIbkrStockMarginRates({ direction: "long", pricePerShare: 111.5 })).toEqual({
      initRatio: 0.5,
      maintRatio: 0.25,
    });
  });

  it("uses Reg T 50% init and 30% maint for shorts above $16.67", () => {
    expect(resolveIbkrStockMarginRates({ direction: "short", pricePerShare: 111.5 })).toEqual({
      initRatio: 0.5,
      maintRatio: 0.3,
    });
  });

  it("applies $5/share short house floor between $5 and $16.67", () => {
    expect(resolveIbkrStockMarginRates({ direction: "short", pricePerShare: 10 })).toEqual({
      initRatio: 0.5,
      maintRatio: 0.5,
    });
    expect(resolveIbkrStockMarginRates({ direction: "short", pricePerShare: 8 })).toEqual({
      initRatio: 5 / 8,
      maintRatio: 5 / 8,
    });
  });

  it("requires 100% for shorts between $2.50 and $5", () => {
    expect(resolveIbkrStockMarginRates({ direction: "short", pricePerShare: 4 })).toEqual({
      initRatio: 1,
      maintRatio: 1,
    });
  });
});

describe("estimateMarginImpactFromNotional", () => {
  const current = parseMarginSnapshot({
    NetLiquidation: { tag: "NetLiquidation", value: "36948" },
    InitMarginReq: { tag: "InitMarginReq", value: "0" },
    AvailableFunds: { tag: "AvailableFunds", value: "36948" },
    ExcessLiquidity: { tag: "ExcessLiquidity", value: "36948" },
  });

  it("estimates overnight short CSCO at Reg T 50% / maint 30%", () => {
    const notional = 300 * 111.5;
    const impact = estimateMarginImpactFromNotional(current, notional, {
      direction: "short",
      pricePerShare: 111.5,
    });
    expect(impact.initMarginChange).toBeCloseTo(notional * 0.5);
    expect(impact.maintMarginChange).toBeCloseTo(notional * 0.3);
    expect(impact.headroomAfter).toBeCloseTo(36948 - notional * 0.3);
    expect(impact.projectedUtilization).toBeCloseTo((notional * 0.5) / 36948);
    expect(impact.estimated).toBe(true);
  });

  it("does not mark ~300 CSCO shares over on a $37k flat account", () => {
    const notional = 300 * 111.5;
    const impact = estimateMarginImpactFromNotional(current, notional, {
      direction: "short",
      pricePerShare: 111.5,
    });
    expect(impact.projectedUtilization).toBeLessThan(0.9);
    expect(impact.headroomAfter).toBeGreaterThan(0);
  });

  it("estimates long init at Reg T 50% and maint 25%", () => {
    const impact = estimateMarginImpactFromNotional(current, 20000, {
      direction: "long",
      pricePerShare: 100,
    });
    expect(impact.initMarginChange).toBe(10000);
    expect(impact.maintMarginChange).toBe(5000);
  });
});

describe("computeMaxAffordableShares", () => {
  it("derives max shares from broker what-if init margin per share", () => {
    const result = computeMaxAffordableShares({
      availableFunds: 28000,
      initMarginChange: 75,
      quantity: 1,
      pricePerShare: 100,
      direction: "long",
    });

    expect(result).toEqual({
      shares: 373,
      notional: 37300,
      estimated: false,
    });
  });

  it("uses order quantity to scale what-if init margin", () => {
    const result = computeMaxAffordableShares({
      availableFunds: 41000,
      initMarginChange: 4200,
      quantity: 100,
      pricePerShare: 84,
      direction: "long",
    });

    expect(result?.shares).toBe(976);
    expect(result?.notional).toBeCloseTo(976 * 84);
    expect(result?.estimated).toBe(false);
  });

  it("falls back to Reg T estimate when what-if delta is zero", () => {
    const result = computeMaxAffordableShares({
      availableFunds: 36948,
      initMarginChange: 0,
      quantity: 1,
      pricePerShare: 111.5,
      direction: "short",
    });

    expect(result?.shares).toBe(Math.floor(36948 / (111.5 * 0.5)));
    expect(result?.estimated).toBe(true);
  });

  it("returns null when available funds are missing", () => {
    expect(
      computeMaxAffordableShares({
        availableFunds: null,
        initMarginChange: 75,
        quantity: 1,
        pricePerShare: 100,
        direction: "long",
      }),
    ).toBeNull();
  });

  it("returns zero shares when margin per share exceeds available funds", () => {
    const result = computeMaxAffordableShares({
      availableFunds: 50,
      initMarginChange: 100,
      quantity: 1,
      pricePerShare: 200,
      direction: "long",
    });

    expect(result?.shares).toBe(0);
  });
});

describe("resolveMarginImpact", () => {
  const current = parseMarginSnapshot({
    NetLiquidation: { tag: "NetLiquidation", value: "100000" },
    InitMarginReq: { tag: "InitMarginReq", value: "19" },
    AvailableFunds: { tag: "AvailableFunds", value: "1047624" },
    ExcessLiquidity: { tag: "ExcessLiquidity", value: "1047626" },
  });

  it("falls back to IBKR Reg T estimate when what-if returns zero deltas", () => {
    const impact = resolveMarginImpact(
      current,
      { initMarginChange: 0, maintMarginChange: 0, warningText: null },
      37851,
      { direction: "long", pricePerShare: 24.42 },
    );
    expect(impact?.initMarginChange).toBeCloseTo(37851 * 0.5);
    expect(impact?.maintMarginChange).toBeCloseTo(37851 * 0.25);
    expect(impact?.estimated).toBe(true);
  });

  it("prefers what-if when deltas are present", () => {
    const impact = resolveMarginImpact(
      current,
      { initMarginChange: 4200, maintMarginChange: 3500, warningText: null },
      37851,
    );
    expect(impact?.initMarginChange).toBe(4200);
    expect(impact?.estimated).toBe(false);
  });
});

describe("classifyMarginStatus", () => {
  it("returns over when init delta exceeds available funds", () => {
    expect(classifyMarginStatus(50000, 40000)).toBe("over");
  });

  it("returns tight when init delta exceeds half of available funds", () => {
    expect(classifyMarginStatus(25000, 40000)).toBe("tight");
  });

  it("returns ok when init delta is modest", () => {
    expect(classifyMarginStatus(10000, 40000)).toBe("ok");
  });

  it("returns over when headroom after is negative", () => {
    expect(
      classifyMarginStatus(1000, 40000, { headroomAfter: -500, projectedUtilization: 0.2 }),
    ).toBe("over");
  });
});

describe("classifyUtilizationStatus", () => {
  it("returns tight at 60% utilization", () => {
    expect(classifyUtilizationStatus(0.6)).toBe("tight");
  });

  it("returns ok at low utilization", () => {
    expect(classifyUtilizationStatus(0.1)).toBe("ok");
  });
});

describe("marginStatusTextClass", () => {
  it("maps status to edge tokens", () => {
    expect(marginStatusTextClass("ok")).toContain("--edge-positive");
    expect(marginStatusTextClass("tight")).toContain("--edge-warning");
    expect(marginStatusTextClass("over")).toContain("--edge-negative");
    expect(marginStatusBarColor("ok")).toBe("var(--edge-positive)");
  });
});

describe("formatUtilizationPercent", () => {
  it("formats finite utilization", () => {
    expect(formatUtilizationPercent(0.625)).toBe("63%");
  });

  it("returns dash for null", () => {
    expect(formatUtilizationPercent(null)).toBe("—");
  });
});

describe("computeMarginBarSegments", () => {
  it("returns existing width only when no projected util", () => {
    expect(computeMarginBarSegments(0.62, null)).toEqual({
      existingPercent: 62,
      tradePercent: 0,
    });
  });

  it("stacks trade segment after existing use", () => {
    const segments = computeMarginBarSegments(0.62, 0.662);
    expect(segments.existingPercent).toBe(62);
    expect(segments.tradePercent).toBeCloseTo(4.2);
  });

  it("caps trade segment at remaining track space", () => {
    const segments = computeMarginBarSegments(0.9, 1.05);
    expect(segments.existingPercent).toBe(90);
    expect(segments.tradePercent).toBeCloseTo(10);
  });
});

describe("formatMarginUtilRange", () => {
  it("shows current only when impact hidden", () => {
    expect(formatMarginUtilRange(0.62, 0.66, false)).toBe("62% now");
  });

  it("shows now to after when impact shown", () => {
    expect(formatMarginUtilRange(0, 0.04, true)).toBe("0% now → 4% after");
  });
});

describe("marginStatusPlainLabel", () => {
  it("maps status to plain language", () => {
    expect(marginStatusPlainLabel("ok")).toBe("Plenty of room");
    expect(marginStatusPlainLabel("tight")).toBe("Getting tight");
    expect(marginStatusPlainLabel("over")).toBe("Over limit");
  });
});

describe("projectHoldToStop", () => {
  const impact = {
    initMarginChange: 4200,
    maintMarginChange: 3500,
    projectedUtilization: 0.662,
    headroomAfter: 34500,
    warningText: null,
    estimated: false,
  };

  it("projects long liquidation below entry when cushion allows", () => {
    const projection = projectHoldToStop({
      entry: 24.42,
      stop: 21.84,
      shares: 1000,
      direction: "long",
      impact,
    });

    expect(projection).not.toBeNull();
    expect(projection!.liquidationPrice).toBeLessThan(24.42);
    expect(projection!.verdict).toBe("stop_reachable");
    expect(projection!.distanceFromStop).toBeGreaterThan(0);
  });

  it("returns margin_call_first when liq sits above stop on a long", () => {
    const projection = projectHoldToStop({
      entry: 24.42,
      stop: 21.84,
      shares: 1000,
      direction: "long",
      impact: { ...impact, headroomAfter: 500 },
    });

    expect(projection).not.toBeNull();
    expect(projection!.verdict).toBe("margin_call_first");
    expect(projection!.liquidationPrice).toBeGreaterThan(21.84);
  });

  it("projects short liquidation above entry with (1+m) adverse math", () => {
    const projection = projectHoldToStop({
      entry: 50,
      stop: 55,
      shares: 200,
      direction: "short",
      impact: {
        ...impact,
        maintMarginChange: 200 * 50 * 0.3,
        headroomAfter: 10000,
      },
    });

    expect(projection).not.toBeNull();
    // cushion / (shares * (1 + 0.3)) = 10000 / 260 ≈ 38.46 → liq ≈ 88.46
    expect(projection!.liquidationPrice).toBeCloseTo(50 + 10000 / (200 * 1.3), 5);
    expect(projection!.verdict).toBe("stop_reachable");
    expect(projection!.maintRatio).toBeCloseTo(0.3);
  });

  it("uses IBKR long maint ratio when maint delta is zero", () => {
    const projection = projectHoldToStop({
      entry: 100,
      stop: 95,
      shares: 100,
      direction: "long",
      impact: {
        ...impact,
        maintMarginChange: 0,
        estimated: true,
      },
    });

    expect(projection).not.toBeNull();
    expect(projection!.maintRatio).toBe(0.25);
    expect(projection!.estimated).toBe(true);
  });

  it("uses IBKR short 30% maint when maint delta is zero", () => {
    const projection = projectHoldToStop({
      entry: 111.5,
      stop: 115.5,
      shares: 300,
      direction: "short",
      impact: {
        ...impact,
        maintMarginChange: 0,
        headroomAfter: 20000,
        estimated: true,
      },
    });

    expect(projection).not.toBeNull();
    expect(projection!.maintRatio).toBe(0.3);
  });

  it("returns null when headroom is unavailable", () => {
    expect(
      projectHoldToStop({
        entry: 100,
        stop: 95,
        shares: 100,
        direction: "long",
        impact: { ...impact, headroomAfter: null },
      }),
    ).toBeNull();
  });
});

describe("formatHoldToStopSummary", () => {
  it("formats stop reachable copy", () => {
    expect(
      formatHoldToStopSummary({
        liquidationPrice: 14.82,
        verdict: "stop_reachable",
        distanceFromStop: 6.6,
        liqRelativeToStop: "below",
        maintRatio: 0.25,
        estimated: false,
      }),
    ).toContain("Stop reachable");
    expect(
      formatHoldToStopSummary({
        liquidationPrice: 14.82,
        verdict: "stop_reachable",
        distanceFromStop: 6.6,
        liqRelativeToStop: "below",
        maintRatio: 0.25,
        estimated: false,
      }),
    ).toContain("below stop");
  });

  it("formats margin call first copy", () => {
    expect(
      formatHoldToStopSummary({
        liquidationPrice: 22.4,
        verdict: "margin_call_first",
        distanceFromStop: 0.56,
        liqRelativeToStop: "above",
        maintRatio: 0.25,
        estimated: false,
      }),
    ).toBe("Margin call first · Liq 22.40");
  });
});
