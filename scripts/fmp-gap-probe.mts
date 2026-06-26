#!/usr/bin/env npx tsx
import { config } from "dotenv";
import { createMarketDataService } from "../src/lib/marketData/service/marketDataService";
import { createYahooProvider } from "../src/lib/marketData/providers/yahoo/adapter";
import { createFmpProvider } from "../src/lib/marketData/providers/fmp/adapter";

config({ path: ".env.local" });

const yahooStub = {
  searchSymbols: async () => [],
  getChartCandles: async () => [],
  getChartCandlesBefore: async () => [],
  getQuoteSnapshots: async () => [],
  getFundamentalsSnapshot: async () => null,
};

function addDaysIso(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function isRestricted(warnings: string[]): boolean {
  return warnings.some(
    (warning) =>
      warning.includes("402") ||
      warning.includes("403") ||
      warning.toLowerCase().includes("restricted"),
  );
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
  const fmp = createFmpProvider();

  let passed = 0;
  let total = 0;

  const run = async (name: string, fn: () => Promise<{ ok: boolean; detail: string }>) => {
    total += 1;
    if (await check(name, fn)) passed += 1;
  };

  await run("profile", async () => {
    const result = await service.getFmpCompanyProfile("AAPL");
    return {
      ok: result.data != null,
      detail: `source=${result.source} sector=${result.data?.sector ?? "null"}`,
    };
  });

  await run("estimates", async () => {
    const result = await service.getFmpAnalystEstimates({ symbol: "AAPL", limit: 2 });
    return {
      ok: result.data.length > 0,
      detail: `count=${result.data.length}`,
    };
  });

  await run("financials", async () => {
    const result = await service.getFmpFinancials({ symbol: "AAPL", limit: 2 });
    return {
      ok: result.data.incomeStatements.length > 0,
      detail: `income=${result.data.incomeStatements.length} ratios=${result.data.ratios.length}`,
    };
  });

  await run("executives", async () => {
    const result = await service.getFmpExecutives("AAPL");
    return {
      ok: result.data.length > 0,
      detail: `count=${result.data.length}`,
    };
  });

  await run("events", async () => {
    const result = await service.getCorporateEvents({ symbol: "AAPL" });
    const types = [...new Set(result.data.map((event) => event.type))];
    return {
      ok: result.data.length > 0,
      detail: `count=${result.data.length} types=${types.join(",")}`,
    };
  });

  await run("filings", async () => {
    const result = await service.getFmpSecFilings({
      symbol: "AAPL",
      from: "2026-01-01",
      to: "2026-06-24",
      limit: 3,
    });
    return {
      ok: result.data.length > 0,
      detail: `count=${result.data.length}`,
    };
  });

  await run("movers", async () => {
    const result = await service.getFmpMarketMovers({ kind: "gainers", limit: 5 });
    return {
      ok: result.data.length > 0,
      detail: `count=${result.data.length}`,
    };
  });

  await run("economic-calendar", async () => {
    const from = new Date().toISOString().slice(0, 10);
    const to = addDaysIso(from, 90);
    const result = await fmp.getEconomicCalendar({ from, to });
    const sample = result.events[0];
    const fields = sample ? Object.keys(sample).join(",") : "none";
    const restricted = isRestricted(result.warnings);
    return {
      ok: !restricted && result.events.length > 0,
      detail: `count=${result.events.length} fields=${fields} warnings=${result.warnings.join("|") || "none"}`,
    };
  });

  await run("news-stock", async () => {
    const result = await service.getNews({ symbol: "AAPL", limit: 3 });
    const restricted = isRestricted(result.warnings);
    return {
      ok: !restricted && result.data.length > 0,
      detail: `count=${result.data.length} restricted=${restricted} warnings=${result.warnings.join("|") || "none"}`,
    };
  });

  await run("news-general", async () => {
    const result = await service.getNews({ limit: 3 });
    const restricted = isRestricted(result.warnings);
    return {
      ok: !restricted && result.data.length > 0,
      detail: `count=${result.data.length} restricted=${restricted} warnings=${result.warnings.join("|") || "none"}`,
    };
  });

  console.log(`\nFMP_GAP_VALIDATION: ${passed}/${total} checks passed`);
  process.exit(passed === total ? 0 : 1);
}

void main();
