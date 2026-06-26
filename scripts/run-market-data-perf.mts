import { config } from "dotenv";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getChartCandles,
  getChartCandlesBefore,
  getFundamentalsSnapshot,
  getQuoteSnapshots,
  searchSymbols,
} from "../src/lib/yahooFinance.ts";
import {
  clearMarketDataCacheForTests,
  createMarketDataService,
} from "../src/lib/marketData/service/marketDataService.ts";
import { clearHotStoreForTests } from "../src/lib/marketData/hotStore.ts";
import { createMarketDataTraceId } from "../src/lib/marketData/telemetry/trace.ts";
import type {
  MarketDataPerfBaseline,
  MarketDataPerfScenarioResult,
} from "../src/lib/marketData/telemetry/types.ts";
import { createTwsProvider } from "../src/lib/marketData/providers/tws/adapter.ts";
import { createIbkrProvider } from "../src/lib/marketData/providers/ibkr/adapter.ts";

config({ path: ".env.local" });
process.env.MARKET_DATA_PERF = "1";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const perfDir = path.join(repoRoot, "docs/perf");

const WATCHLIST_SYMBOLS = [
  "AAPL",
  "MSFT",
  "GOOGL",
  "AMZN",
  "NVDA",
  "META",
  "TSLA",
  "BRK-B",
  "UNH",
  "JPM",
];

function gitMeta(): MarketDataPerfBaseline["git"] {
  try {
    return {
      commit: execSync("git rev-parse --short HEAD", { cwd: repoRoot, encoding: "utf8" }).trim(),
      branch: execSync("git rev-parse --abbrev-ref HEAD", { cwd: repoRoot, encoding: "utf8" }).trim(),
    };
  } catch {
    return {};
  }
}

function createService() {
  return createMarketDataService({
    yahoo: {
      searchSymbols,
      getChartCandles,
      getChartCandlesBefore,
      getQuoteSnapshots,
      getFundamentalsSnapshot,
    },
  });
}

async function probeProviders(): Promise<{
  twsEnabled: boolean;
  ibkrEnabled: boolean;
  twsGatewayConnected?: boolean;
  ibkrAuthenticated?: boolean;
}> {
  const twsEnabled = process.env.TWS_ENABLED === "true";
  const ibkrEnabled = process.env.IBKR_ENABLED === "true";
  let twsGatewayConnected: boolean | undefined;
  let ibkrAuthenticated: boolean | undefined;

  if (twsEnabled) {
    try {
      const tws = createTwsProvider();
      const status = await tws.getStatusProbe();
      twsGatewayConnected = status.gatewayConnected;
    } catch {
      twsGatewayConnected = false;
    }
  }

  if (ibkrEnabled) {
    try {
      const ibkr = createIbkrProvider();
      const status = await ibkr.getStatusProbe();
      ibkrAuthenticated = status.authenticated;
    } catch {
      ibkrAuthenticated = false;
    }
  }

  return { twsEnabled, ibkrEnabled, twsGatewayConnected, ibkrAuthenticated };
}

function scenarioFromResult(
  scenario: string,
  traceId: string,
  startedAt: number,
  result: {
    source?: string;
    cacheTier?: MarketDataPerfScenarioResult["cacheTier"];
    phases?: MarketDataPerfScenarioResult["phases"];
    data?: unknown;
    warnings?: string[];
  },
  counts?: MarketDataPerfScenarioResult["counts"],
): MarketDataPerfScenarioResult {
  const totalMs = Date.now() - startedAt;
  return {
    scenario,
    traceId,
    ok: true,
    totalMs,
    serverMs: totalMs,
    source: result.source,
    cacheTier: result.cacheTier,
    provider: result.source,
    counts,
    phases: result.phases,
  };
}

async function runScenario(
  label: string,
  run: (traceId: string) => Promise<MarketDataPerfScenarioResult>,
): Promise<MarketDataPerfScenarioResult> {
  const traceId = createMarketDataTraceId(label);
  try {
    return await run(traceId);
  } catch (error) {
    return {
      scenario: label,
      traceId,
      ok: false,
      totalMs: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main(): Promise<void> {
  console.log("Edge market data performance baseline\n");

  const providerEnv = await probeProviders();
  const service = createService();
  const scenarios: MarketDataPerfScenarioResult[] = [];

  clearMarketDataCacheForTests();
  clearHotStoreForTests();

  scenarios.push(
    await runScenario("cold-chart-candles:AAPL:1d:1y", async (traceId) => {
      const startedAt = Date.now();
      const result = await service.getLegacyCandles(
        { symbol: "AAPL", interval: "1d", range: "1y" },
        { traceId },
      );
      return scenarioFromResult(
        "cold-chart-candles:AAPL:1d:1y",
        traceId,
        startedAt,
        result,
        { bars: result.data.length },
      );
    }),
  );

  scenarios.push(
    await runScenario("warm-chart-revisit:AAPL:1d:1y", async (traceId) => {
      const startedAt = Date.now();
      const result = await service.getLegacyCandles(
        { symbol: "AAPL", interval: "1d", range: "1y" },
        { traceId },
      );
      return scenarioFromResult(
        "warm-chart-revisit:AAPL:1d:1y",
        traceId,
        startedAt,
        result,
        { bars: result.data.length },
      );
    }),
  );

  scenarios.push(
    await runScenario(`watchlist-quotes:${WATCHLIST_SYMBOLS.length}-symbols`, async (traceId) => {
      const startedAt = Date.now();
      const result = await service.getWatchlistQuotes(WATCHLIST_SYMBOLS, { traceId });
      return scenarioFromResult(
        `watchlist-quotes:${WATCHLIST_SYMBOLS.length}-symbols`,
        traceId,
        startedAt,
        result,
        { quotes: result.data.length, symbols: WATCHLIST_SYMBOLS.length },
      );
    }),
  );

  scenarios.push(
    await runScenario("warmup:layout-core", async (traceId) => {
      const startedAt = Date.now();
      const warmup = await service.primeMarketData({
        symbols: WATCHLIST_SYMBOLS.slice(0, 5),
        candleRequests: [
          { symbol: "AAPL", interval: "1d", range: "1y" },
          { symbol: "MSFT", interval: "1d", range: "1y" },
        ],
        optionsSymbol: "AAPL",
        traceId,
      });
      return {
        scenario: "warmup:layout-core",
        traceId,
        ok: true,
        totalMs: Date.now() - startedAt,
        serverMs: warmup.totalMs,
        phases: warmup.phases.map((phase) => ({
          name: phase.name,
          ms: phase.ms,
          ok: phase.ok,
          layer: "service" as const,
          detail: {
            key: phase.key,
            source: phase.source,
            cacheTier: phase.cacheTier,
            error: phase.error,
          },
        })),
        counts: {
          symbols: WATCHLIST_SYMBOLS.slice(0, 5).length,
          candles: 2,
        },
      };
    }),
  );

  scenarios.push(
    await runScenario("options-expirations:AAPL", async (traceId) => {
      const startedAt = Date.now();
      const result = await service.getOptionExpirations("AAPL");
      return scenarioFromResult(
        "options-expirations:AAPL",
        traceId,
        startedAt,
        { ...result, phases: result.phases },
        { contracts: result.data.length },
      );
    }),
  );

  let firstExpiration: string | undefined;
  try {
    const expirations = await service.getOptionExpirations("AAPL");
    firstExpiration = expirations.data[0]?.expiration;
  } catch (error) {
    console.warn(
      "Skipping options chain scenario:",
      error instanceof Error ? error.message : String(error),
    );
  }

  if (firstExpiration) {
    scenarios.push(
      await runScenario(`options-chain:AAPL:${firstExpiration}`, async (traceId) => {
        const startedAt = Date.now();
        const result = await service.getOptionsChain({
          underlying: "AAPL",
          expiration: firstExpiration,
          strikeWindow: { mode: "atm", count: 20 },
        });
        return scenarioFromResult(
          `options-chain:AAPL:${firstExpiration}`,
          traceId,
          startedAt,
          result,
          { contracts: result.data.contracts.length },
        );
      }),
    );
  }

  if (providerEnv.twsEnabled && !providerEnv.twsGatewayConnected) {
    scenarios.push(
      await runScenario("tws-unavailable-fallback:AAPL:1d:1y", async (traceId) => {
        const startedAt = Date.now();
        const result = await service.getLegacyCandles(
          { symbol: "AAPL", interval: "1d", range: "1mo" },
          { traceId },
        );
        return scenarioFromResult(
          "tws-unavailable-fallback:AAPL:1d:1y",
          traceId,
          startedAt,
          result,
          { bars: result.data.length },
        );
      }),
    );
  }

  const baseline: MarketDataPerfBaseline = {
    generatedAt: new Date().toISOString(),
    git: gitMeta(),
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      ...providerEnv,
    },
    scenarios,
  };

  mkdirSync(perfDir, { recursive: true });
  const latestPath = path.join(perfDir, "market-data-baseline-latest.json");
  const stampedPath = path.join(
    perfDir,
    `market-data-baseline-${baseline.generatedAt.replace(/[:.]/g, "-")}.json`,
  );
  const payload = `${JSON.stringify(baseline, null, 2)}\n`;
  writeFileSync(latestPath, payload);
  writeFileSync(stampedPath, payload);

  console.log("\nScenario summary:");
  for (const scenario of baseline.scenarios) {
    const parts = [
      scenario.scenario,
      `${scenario.totalMs}ms`,
      scenario.cacheTier ?? "—",
      scenario.source ?? scenario.provider ?? "—",
    ];
    console.log(`- ${parts.join(" | ")}`);
  }

  console.log(`\nSaved baseline:\n- ${latestPath}\n- ${stampedPath}`);
}

main().catch((error) => {
  console.error("MARKET_DATA_PERF: FAIL", error);
  process.exit(1);
});
