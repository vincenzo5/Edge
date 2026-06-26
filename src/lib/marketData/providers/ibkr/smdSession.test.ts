import { describe, it, expect } from "vitest";
import {
  parseSmdMessagePayload,
  smdUpdatesToQuotes,
} from "./smdSession";

describe("smdSession", () => {
  it("parses smd tick fields into quote updates", () => {
    const conidToSymbol = new Map<number, string>([[265598, "AAPL"]]);
    const updates = parseSmdMessagePayload(
      [
        {
          conid: 265598,
          "31": "C180.25",
          "82": "+1.50",
          "83": "+0.84",
          "87_raw": 12345678,
        },
      ],
      conidToSymbol,
    );

    expect(updates).toEqual([
      {
        symbol: "AAPL",
        conid: 265598,
        price: 180.25,
        change: 1.5,
        changePercent: 0.84,
        volume: 12345678,
      },
    ]);
  });

  it("ignores rows without a subscribed conid mapping", () => {
    const updates = parseSmdMessagePayload(
      [{ conid: 999, "31": "10" }],
      new Map([[265598, "AAPL"]]),
    );
    expect(updates).toEqual([]);
  });

  it("merges smd updates into existing equity quotes", () => {
    const existing = new Map([
      [
        "AAPL",
        {
          symbol: "AAPL",
          shortName: "Apple",
          exchange: "NASDAQ",
          price: 179,
          change: 0.5,
          changePercent: 0.28,
          volume: 1000,
          updatedAt: 1,
        },
      ],
    ]);

    const quotes = smdUpdatesToQuotes(
      [
        {
          symbol: "AAPL",
          conid: 265598,
          price: 180.25,
          change: 1.5,
          changePercent: 0.84,
          volume: 2000,
        },
      ],
      existing,
    );

    expect(quotes[0]).toMatchObject({
      symbol: "AAPL",
      shortName: "Apple",
      exchange: "NASDAQ",
      price: 180.25,
      change: 1.5,
      changePercent: 0.84,
      volume: 2000,
    });
    expect(quotes[0]?.updatedAt).toBeGreaterThan(1);
  });
});
