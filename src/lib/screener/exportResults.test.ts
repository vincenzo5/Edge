import { describe, it, expect } from "vitest";
import { buildResultsCsv, buildSymbolsClipboardText } from "./exportResults";
import type { ScreenerResultRow } from "./types";

const sampleRow: ScreenerResultRow = {
  symbol: "AAPL",
  name: "Apple Inc.",
  price: 200,
  change: 1,
  changePercent: 0.5,
  exchange: "NASDAQ",
  volume: 1_000_000,
  sector: "Technology",
  industry: "Consumer Electronics",
  country: "US",
  beta: 1.1,
  marketCap: 3_000_000_000_000,
  dividendYield: 0.005,
};

describe("exportResults", () => {
  it("builds CSV with configured columns", () => {
    const csv = buildResultsCsv([sampleRow], ["symbol", "name", "price"]);
    expect(csv).toBe("Symbol,Name,Price\nAAPL,Apple Inc.,200");
  });

  it("escapes commas in CSV cells", () => {
    const csv = buildResultsCsv(
      [{ ...sampleRow, name: "Apple, Inc." }],
      ["symbol", "name"],
    );
    expect(csv).toBe('Symbol,Name\nAAPL,"Apple, Inc."');
  });

  it("builds newline-separated symbol clipboard text", () => {
    expect(
      buildSymbolsClipboardText([
        sampleRow,
        { ...sampleRow, symbol: "MSFT" },
      ]),
    ).toBe("AAPL\nMSFT");
  });
});
