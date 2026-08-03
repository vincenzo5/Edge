import { describe, expect, it } from "vitest";
import { resolvePolicyTradeGeometry } from "./resolvePolicyTradeGeometry";

describe("resolvePolicyTradeGeometry", () => {
  const geometry = {
    stops: [{ rMultiple: 1 }],
    targets: [{ rMultiple: 1 }],
  };

  it("uses planLevels when drawing-bound", () => {
    expect(
      resolvePolicyTradeGeometry({
        side: "BUY",
        planLevels: {
          direction: "long",
          side: "BUY",
          entry: 100,
          stop: 95,
          target: 110,
          riskRewardRatio: 2,
        },
      }),
    ).toEqual({
      entry: 100,
      stop: 95,
      target: 110,
      source: "planLevels",
    });
  });

  it("derives target from entry and existing stop", () => {
    expect(
      resolvePolicyTradeGeometry({
        side: "BUY",
        entryPrice: 100,
        existingStop: 95,
        geometry,
      }),
    ).toEqual({
      entry: 100,
      stop: 95,
      target: 105,
      source: "entryAndStop",
    });
  });

  it("derives stop and target from entry, qty, and dollar risk", () => {
    expect(
      resolvePolicyTradeGeometry({
        side: "BUY",
        entryPrice: 100,
        entryQty: 200,
        dollarRisk: 1000,
        geometry,
      }),
    ).toEqual({
      entry: 100,
      stop: 95,
      target: 105,
      source: "entryAndDollarRisk",
    });
  });

  it("returns null when insufficient inputs", () => {
    expect(
      resolvePolicyTradeGeometry({
        side: "BUY",
        entryPrice: 100,
      }),
    ).toBeNull();
  });
});
