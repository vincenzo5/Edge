#!/usr/bin/env npx tsx
import { config } from "dotenv";
import { createMarketDataService } from "../src/lib/marketData/service/marketDataService";
import { createYahooProvider } from "../src/lib/marketData/providers/yahoo/adapter";
import { PRIORITY_ONE_MACRO_IDS } from "../src/lib/marketData/events/registry";
import { fmpApiKey } from "../src/lib/marketData/providers/fmp/client";

config({ path: ".env.local" });

const yahooStub = {
  searchSymbols: async () => [],
  getChartCandles: async () => [],
  getChartCandlesBefore: async () => [],
  getQuoteSnapshots: async () => [],
  getFundamentalsSnapshot: async () => null,
};

const REQUIRED_MACRO_IDS = ["cpi", "fomc_rate_decision", "nonfarm_payrolls", "pce", "core_pce"] as const;

function addDaysIso(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function check(name: string, fn: () => Promise<{ ok: boolean; detail: string }>) {
  try {
    const result = await fn();
    console.log(`${result.ok ? "PASS" : "WARN"} ${name}: ${result.detail}`);
    return result.ok;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`FAIL ${name}: ${message}`);
    return false;
  }
}

async function main() {
  const service = createMarketDataService({
    yahoo: createYahooProvider(yahooStub),
  });
  const fmpConfigured = fmpApiKey() != null;

  let passed = 0;
  let total = 0;

  const run = async (name: string, fn: () => Promise<{ ok: boolean; detail: string }>) => {
    total += 1;
    if (await check(name, fn)) passed += 1;
  };

  await run("corporate+filing events (AAPL)", async () => {
    const result = await service.getMarketEvents({ symbol: "AAPL" });
    const families = [...new Set(result.data.map((event) => event.family))];
    return {
      ok: result.data.length > 0,
      detail: `count=${result.data.length} families=${families.join(",")} source=${result.source}`,
    };
  });

  await run("legacy corporate events wrapper", async () => {
    const result = await service.getCorporateEvents({ symbol: "AAPL" });
    const types = [...new Set(result.data.map((event) => event.type))];
    return {
      ok: result.data.length > 0,
      detail: `count=${result.data.length} types=${types.join(",")}`,
    };
  });

  await run("macro full coverage (includeMacro)", async () => {
    const from = new Date().toISOString().slice(0, 10);
    const to = addDaysIso(from, 90);
    const result = await service.getMarketEvents({
      includeMacro: true,
      families: ["macro"],
      from,
      to,
    });
    const matchedRequired = REQUIRED_MACRO_IDS.filter((id) =>
      result.data.some((event) => event.canonicalId === id),
    );
    const matchedPriority = PRIORITY_ONE_MACRO_IDS.filter((id) =>
      result.data.some((event) => event.canonicalId === id),
    );
    const fullEvents = result.data.filter((event) => event.coverageLevel === "full");
    const fmpFull = fullEvents.filter((event) => event.source === "fmp");
    const partialOnly =
      result.data.length > 0 && result.data.every((event) => event.coverageLevel === "partial");

    if (!fmpConfigured) {
      return {
        ok: matchedPriority.length > 0 || result.warnings.length > 0,
        detail: `FMP not configured; partial fallback matched=${matchedPriority.length}/${PRIORITY_ONE_MACRO_IDS.length}`,
      };
    }

    return {
      ok:
        matchedRequired.length >= 3 &&
        fmpFull.length > 0 &&
        !partialOnly &&
        !result.warnings.some((warning) => warning.includes("partial via FRED fallback")),
      detail: `required=${matchedRequired.length}/${REQUIRED_MACRO_IDS.length} priority=${matchedPriority.length}/${PRIORITY_ONE_MACRO_IDS.length} fmpFull=${fmpFull.length} partialOnly=${partialOnly}`,
    };
  });

  await run("registry coverage contract", async () => {
    const result = await service.getMarketEvents({ symbol: "AAPL", canonicalIds: ["earnings"] });
    return {
      ok: result.data.every((event) => event.canonicalId === "earnings"),
      detail: `earnings=${result.data.length}`,
    };
  });

  console.log(`\nEVENTS_COVERAGE_VALIDATION: ${passed}/${total}`);
  if (passed < total) process.exitCode = 1;
}

void main();
