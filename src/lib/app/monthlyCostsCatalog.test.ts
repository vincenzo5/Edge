import { describe, expect, it } from "vitest";
import {
  MONTHLY_COSTS_CATALOG,
  formatUsd,
  resolveConfiguredStatus,
  sumConfiguredFixed,
} from "./monthlyCostsCatalog";
import type { ServerHealthPayload } from "@/lib/marketData/health";

function healthWith(providers: ServerHealthPayload["providers"]): ServerHealthPayload {
  return {
    generatedAt: Date.now(),
    providers,
    recentWarnings: [],
    cache: { kind: "memory", degraded: false, lastPingOk: null, lastPingAt: null },
  };
}

describe("monthlyCostsCatalog", () => {
  it("formats USD amounts", () => {
    expect(formatUsd(199)).toBe("$199.00");
    expect(formatUsd(null)).toBe("$—");
    expect(formatUsd(0)).toBe("$0.00");
  });

  it("sums configured fixed rows only", () => {
    const health = healthWith([
      { id: "massive", label: "Massive", configured: true, status: "healthy", detail: "ok" },
      { id: "fmp", label: "FMP", configured: false, status: "disabled", detail: "missing" },
    ]);

    const total = sumConfiguredFixed(MONTHLY_COSTS_CATALOG, health);
    expect(total).toBe(79);
  });

  it("excludes manual and unconfigured fixed rows from total", () => {
    const health = healthWith([]);
    expect(sumConfiguredFixed(MONTHLY_COSTS_CATALOG, health)).toBe(0);
  });

  it("resolves configured status from health", () => {
    const massiveStocksRow = MONTHLY_COSTS_CATALOG.find((row) => row.id === "massive-stocks")!;
    const massiveOptionsRow = MONTHLY_COSTS_CATALOG.find((row) => row.id === "massive-options")!;
    const ibRow = MONTHLY_COSTS_CATALOG.find((row) => row.id === "ib-market-data")!;
    const yahooRow = MONTHLY_COSTS_CATALOG.find((row) => row.id === "yahoo")!;

    expect(resolveConfiguredStatus(massiveStocksRow, null)).toBe("not-configured");
    expect(
      resolveConfiguredStatus(
        massiveStocksRow,
        healthWith([
          { id: "massive", label: "Massive", configured: true, status: "healthy", detail: "ok" },
        ]),
      ),
    ).toBe("configured");
    expect(resolveConfiguredStatus(massiveOptionsRow, null)).toBe("inactive");
    expect(resolveConfiguredStatus(ibRow, null)).toBe("manual");
    expect(resolveConfiguredStatus(yahooRow, null)).toBe("included");
  });
});
