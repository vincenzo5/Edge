import { describe, expect, it } from "vitest";
import type { FmpMarketMover, FmpScreenerRow } from "../contracts/fmp";
import {
  buildDescriptorMap,
  enrichMoversWithDescriptors,
} from "./enrichMoversWithDescriptors";

const mover: FmpMarketMover = {
  symbol: "NVDA",
  name: "NVIDIA",
  price: 120,
  change: 5,
  changePercent: 4.3,
  exchange: "NASDAQ",
  volume: null,
};

const descriptor: FmpScreenerRow = {
  symbol: "NVDA",
  name: "NVIDIA Corporation",
  price: 119,
  change: 4,
  changePercent: 3.5,
  exchange: "NASDAQ",
  volume: 50_000_000,
  sector: "Technology",
  industry: "Semiconductors",
  country: "US",
  beta: 1.7,
  marketCap: 3_000_000_000_000,
  dividendYield: 0.001,
};

describe("enrichMoversWithDescriptors", () => {
  it("joins descriptor fundamentals onto movers", () => {
    const map = buildDescriptorMap([descriptor]);
    const enriched = enrichMoversWithDescriptors([mover], map);
    expect(enriched[0]).toEqual(
      expect.objectContaining({
        symbol: "NVDA",
        changePercent: 4.3,
        volume: 50_000_000,
        sector: "Technology",
        industry: "Semiconductors",
        marketCap: 3_000_000_000_000,
        beta: 1.7,
      }),
    );
  });

  it("leaves movers unchanged when descriptor is missing", () => {
    const enriched = enrichMoversWithDescriptors([mover], new Map());
    expect(enriched[0]).toEqual(mover);
  });
});
