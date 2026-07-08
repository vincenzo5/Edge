import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { parseFlexCsv } from "@/lib/journal/flexImport/parseFlexCsv";

describe("parseFlexCsv", () => {
  it("parses stock flex csv fixture", () => {
    const csv = readFileSync(
      join(process.cwd(), "src/lib/journal/flexImport/fixtures/flex-trades-stk.csv"),
      "utf8",
    );
    const parsed = parseFlexCsv(csv);
    expect(parsed.errors).toEqual([]);
    expect(parsed.fills).toHaveLength(2);
  });

  it("parses option spread fixture", () => {
    const csv = readFileSync(
      join(process.cwd(), "src/lib/journal/flexImport/fixtures/flex-trades-opt-spread.csv"),
      "utf8",
    );
    const parsed = parseFlexCsv(csv);
    expect(parsed.errors).toEqual([]);
    expect(parsed.fills.length).toBeGreaterThanOrEqual(4);
    expect(parsed.fills.some((fill) => fill.orderRef === "IC-OPEN-1")).toBe(true);
  });

  it("returns actionable error for malformed headers", () => {
    const parsed = parseFlexCsv("foo,bar\n1,2");
    expect(parsed.errors[0]).toMatch(/Missing required columns/);
  });

  it("parses IB Flex export headers with signed quantities", () => {
    const csv = readFileSync(
      join(process.cwd(), "src/lib/journal/flexImport/fixtures/flex-trades-ib-export.csv"),
      "utf8",
    );
    const parsed = parseFlexCsv(csv);
    expect(parsed.errors).toEqual([]);
    expect(parsed.skipped).toBe(0);
    expect(parsed.fills).toHaveLength(2);

    const sell = parsed.fills.find((fill) => fill.side === "SLD");
    expect(sell).toMatchObject({
      execId: "00013d66.6a3bba0c.01.01",
      side: "SLD",
      quantity: 200,
      price: 296.06,
      account: "U25026894",
      orderId: 5346740818,
      commission: -2.2593672,
      realizedPNL: 0,
      contract: { symbol: "AAPL", secType: "STK" },
    });
    expect(sell?.fillTime.startsWith("2026-06-24")).toBe(true);
    const sellTime = new Date(sell!.fillTime);
    expect(sellTime.getHours()).toBe(9);
    expect(sellTime.getMinutes()).toBe(35);

    const buy = parsed.fills.find((fill) => fill.side === "BOT");
    expect(buy).toMatchObject({
      execId: "00015e71.6a3d4a43.01.01",
      quantity: 100,
      realizedPNL: 1611.370017,
    });
  });
});
