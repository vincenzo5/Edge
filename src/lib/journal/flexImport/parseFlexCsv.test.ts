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
    // Flex DateTime is America/New_York; 2026-06-24 is EDT (UTC-4).
    expect(sell?.fillTime).toBe("2026-06-24T13:35:42.000Z");

    const buy = parsed.fills.find((fill) => fill.side === "BOT");
    expect(buy).toMatchObject({
      execId: "00015e71.6a3d4a43.01.01",
      quantity: 100,
      realizedPNL: 1611.370017,
    });
  });

  it("parses live Flex CONF query Date/Time headers (not DateTime)", () => {
    const csv = readFileSync(
      join(process.cwd(), "src/lib/journal/flexImport/fixtures/flex-trades-conf-query.csv"),
      "utf8",
    );
    const parsed = parseFlexCsv(csv);
    expect(parsed.errors).toEqual([]);
    expect(parsed.skipped).toBe(0);
    expect(parsed.fills).toHaveLength(2);

    const sell = parsed.fills.find((fill) => fill.execId === "00013d66.6a3bba0c.01.01");
    expect(sell).toMatchObject({
      side: "SLD",
      quantity: 200,
      price: 296.06,
      commission: -2.2593672,
      account: "U25026894",
    });
    expect(sell?.fillTime).toBe("2026-06-24T13:35:42.000Z");
    expect(sell?.realizedPNL).toBeNull();

    const buy = parsed.fills.find((fill) => fill.execId === "00015e71.6a3d4a43.01.01");
    expect(buy?.fillTime).toBe("2026-06-25T13:41:55.000Z");
  });
});
