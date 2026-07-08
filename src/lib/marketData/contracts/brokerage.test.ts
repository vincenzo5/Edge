import { describe, expect, it } from "vitest";
import {
  AccountExecutionSchema,
  formatExecutionLabel,
} from "./brokerage";

describe("AccountExecutionSchema", () => {
  it("accepts extended execution with contract and orderRef", () => {
    const parsed = AccountExecutionSchema.safeParse({
      execId: "e1",
      orderRef: "spread-1",
      contract: {
        conId: 123,
        symbol: "AAPL",
        secType: "OPT",
        strike: 200,
        right: "C",
        lastTradeDateOrContractMonth: "20260718",
        localSymbol: "AAPL  260718C00200000",
      },
      side: "BOT",
      shares: 1,
      price: 2.5,
    });
    expect(parsed.success).toBe(true);
  });
});

describe("formatExecutionLabel", () => {
  it("formats stock fills", () => {
    expect(
      formatExecutionLabel({
        symbol: "AAPL",
        side: "BOT",
        shares: 5,
        price: 150,
      }),
    ).toBe("AAPL · BOT 5 @ 150");
  });

  it("formats option fills with strike and right", () => {
    expect(
      formatExecutionLabel({
        contract: {
          symbol: "AAPL",
          secType: "OPT",
          localSymbol: "AAPL  260718C00200000",
          strike: 200,
          right: "C",
          lastTradeDateOrContractMonth: "20260718",
        },
        side: "SLD",
        shares: 2,
        price: 1.25,
      }),
    ).toBe("AAPL  260718C00200000 · 200C 20260718 · SLD 2 @ 1.25");
  });
});
