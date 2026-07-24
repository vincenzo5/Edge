import { describe, expect, it } from "vitest";

import { resolveAlertPrefillFromSearchParams } from "./openAlertPrefill";

describe("openAlertPrefill", () => {
  it("parses price alert prefill from search params", () => {
    const params = new URLSearchParams(
      "symbol=spy&alertPrice=450.5&alertOperator=cross_above",
    );
    expect(resolveAlertPrefillFromSearchParams(params)).toEqual({
      symbol: "SPY",
      operator: "cross_above",
      price: 450.5,
    });
  });

  it("parses drawing-bound prefill params", () => {
    const params = new URLSearchParams(
      "symbol=spy&alertPrice=100&alertPriceHigh=110&alertOperator=enter_zone&alertDrawingId=d1&alertDrawingKind=rectangle",
    );
    expect(resolveAlertPrefillFromSearchParams(params)).toEqual({
      symbol: "SPY",
      operator: "enter_zone",
      price: 100,
      drawingId: "d1",
      drawingKind: "rectangle",
      priceHigh: 110,
    });
  });
});

describe("buildScriptAlertPrefill", () => {
  it("builds script alert prefill payload", async () => {
    const { buildScriptAlertPrefill } = await import("./openAlertPrefill");
    expect(
      buildScriptAlertPrefill({
        symbol: "aapl",
        scriptId: "alert-condition-cross",
        revision: "golden-v1",
        conditionId: "crossUp",
        title: "Cross up",
      }),
    ).toEqual({
      symbol: "AAPL",
      operator: "touch_above",
      price: 0,
      scriptId: "alert-condition-cross",
      revision: "golden-v1",
      conditionId: "crossUp",
      scriptTitle: "Cross up",
    });
  });
});
