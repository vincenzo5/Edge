import { describe, expect, it } from "vitest";
import {
  dollarRiskFromTicketRiskInput,
  qtyFromTicketDollarRisk,
  ticketRiskFromQty,
} from "./ticketSizeBudget";

describe("ticketSizeBudget", () => {
  it("sizes qty from dollar risk and stop distance", () => {
    expect(
      qtyFromTicketDollarRisk({ entry: 100, stop: 95, dollarRisk: 1000 }),
    ).toBe(200);
  });

  it("derives percent risk from qty", () => {
    expect(
      ticketRiskFromQty({
        entry: 100,
        stop: 95,
        qty: 200,
        unit: "percent",
        accountBasisValue: 100_000,
      }),
    ).toEqual({ riskPercent: 1, absoluteRisk: 1000 });
  });

  it("derives absolute risk from qty", () => {
    expect(
      ticketRiskFromQty({
        entry: 100,
        stop: 95,
        qty: 200,
        unit: "absolute",
        accountBasisValue: null,
      }),
    ).toEqual({ riskPercent: null, absoluteRisk: 1000 });
  });

  it("converts percent input to dollar risk", () => {
    expect(
      dollarRiskFromTicketRiskInput({
        unit: "percent",
        riskPercent: 10,
        absoluteRisk: null,
        accountBasisValue: 100_000,
      }),
    ).toBe(10_000);
  });
});
