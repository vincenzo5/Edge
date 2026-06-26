import { describe, it, expect } from "vitest";
import { buildChartCopyItems } from "./chartCopyMenu";
import type { Candle } from "@/lib/chart/contracts";

const baseInput = {
  valueLabel: null as string | null,
  timestamp: null as number | null,
  dataIndex: null as number | null,
  candles: [] as Candle[],
  symbol: "AAPL",
  exchange: undefined as string | undefined,
  interval: "1d" as const,
  range: "1y" as const,
  rangePreset: null as const,
  chartType: "candle_solid" as const,
  timeZone: "UTC" as const,
};

const sampleCandle: Candle = {
  t: Date.UTC(2026, 5, 23, 14, 30),
  o: 201.1,
  h: 203.4,
  l: 199.8,
  c: 202.55,
  v: 54_200_000,
};

function itemIds(items: ReturnType<typeof buildChartCopyItems>) {
  return items.map((item) => item.id);
}

describe("buildChartCopyItems", () => {
  it("always includes symbol and chart context", () => {
    const items = buildChartCopyItems(baseInput);

    expect(itemIds(items)).toEqual(["symbol", "chart-context"]);
    expect(items.find((item) => item.id === "symbol")?.value).toBe("AAPL");
    expect(items.find((item) => item.id === "chart-context")?.value).toBe(
      "AAPL · D · 1Y · Candles",
    );
  });

  it("includes symbol + exchange when exchange is set", () => {
    const items = buildChartCopyItems({
      ...baseInput,
      exchange: "NASDAQ",
    });

    expect(itemIds(items)).toContain("symbol-exchange");
    expect(items.find((item) => item.id === "symbol-exchange")?.value).toBe(
      "NASDAQ:AAPL",
    );
    expect(items.find((item) => item.id === "chart-context")?.value).toBe(
      "NASDAQ:AAPL · D · 1Y · Candles",
    );
  });

  it("includes price when valueLabel is set", () => {
    const items = buildChartCopyItems({
      ...baseInput,
      valueLabel: "46.18",
    });

    expect(items.find((item) => item.id === "price")?.value).toBe("46.18");
  });

  it("includes date/time when timestamp is set", () => {
    const items = buildChartCopyItems({
      ...baseInput,
      timestamp: sampleCandle.t,
    });

    expect(items.find((item) => item.id === "date-time")?.value).toBe(
      "2026-06-23",
    );
  });

  it("includes intraday date/time for minute intervals", () => {
    const items = buildChartCopyItems({
      ...baseInput,
      interval: "5m",
      timestamp: sampleCandle.t,
    });

    expect(items.find((item) => item.id === "date-time")?.value).toBe(
      "2026-06-23 14:30",
    );
  });

  it("includes OHLC, volume, and candle summary for a valid candle", () => {
    const items = buildChartCopyItems({
      ...baseInput,
      dataIndex: 0,
      candles: [sampleCandle],
      exchange: "NASDAQ",
    });

    expect(items.find((item) => item.id === "ohlc")?.value).toBe(
      "O 201.1 H 203.4 L 199.8 C 202.55",
    );
    expect(items.find((item) => item.id === "volume")?.value).toBe("54.2M");
    expect(items.find((item) => item.id === "candle-data")?.value).toBe(
      "NASDAQ:AAPL D 2026-06-23 O 201.1 H 203.4 L 199.8 C 202.55 V 54.2M",
    );
  });

  it("omits volume when candle volume is missing", () => {
    const candle: Candle = {
      t: sampleCandle.t,
      o: 10,
      h: 11,
      l: 9,
      c: 10.5,
    };
    const items = buildChartCopyItems({
      ...baseInput,
      dataIndex: 0,
      candles: [candle],
    });

    expect(itemIds(items)).not.toContain("volume");
    expect(items.find((item) => item.id === "candle-data")?.value).toBe(
      "AAPL D 2026-06-23 O 10 H 11 L 9 C 10.5",
    );
  });

  it("handles missing crosshair and candle data without throwing", () => {
    expect(() => buildChartCopyItems(baseInput)).not.toThrow();
    expect(buildChartCopyItems(baseInput).length).toBeGreaterThan(0);
  });

  it("resolves candle by timestamp when dataIndex is invalid", () => {
    const items = buildChartCopyItems({
      ...baseInput,
      dataIndex: 99,
      timestamp: sampleCandle.t,
      candles: [sampleCandle],
    });

    expect(items.find((item) => item.id === "ohlc")).toBeTruthy();
  });
});
