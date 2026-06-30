import { describe, it, expect } from "vitest";
import { screenQueryToFmpParams } from "./screenerParams";

describe("screenQueryToFmpParams", () => {
  it("maps descriptive filters and ranges to FMP flat params", () => {
    expect(
      screenQueryToFmpParams({
        sector: "Technology",
        industry: "Software",
        country: "US",
        exchange: "NASDAQ",
        isEtf: false,
        isActivelyTrading: true,
        marketCap: { min: 10_000_000_000 },
        price: { min: 5, max: 500 },
        beta: { min: 1.5 },
        volume: { min: 1_000_000 },
        dividend: { min: 0.02 },
        limit: 100,
      }),
    ).toEqual({
      sector: "Technology",
      industry: "Software",
      country: "US",
      exchange: "NASDAQ",
      isEtf: "false",
      isActivelyTrading: "true",
      marketCapMoreThan: "10000000000",
      priceMoreThan: "5",
      priceLowerThan: "500",
      betaMoreThan: "1.5",
      volumeMoreThan: "1000000",
      dividendMoreThan: "0.02",
      limit: "100",
    });
  });

  it("defaults limit when omitted", () => {
    expect(screenQueryToFmpParams({ limit: 200 })).toEqual({ limit: "200" });
  });

  it("joins array text filters with commas for FMP OR", () => {
    expect(
      screenQueryToFmpParams({
        sector: ["Technology", "Healthcare"],
        limit: 50,
      }),
    ).toEqual({
      sector: "Technology,Healthcare",
      limit: "50",
    });
  });
});
