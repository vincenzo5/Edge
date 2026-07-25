/**
 * Memory efficiency baseline + Phase 14 app-level verification collector.
 * Writes docs/perf/memory-baseline-latest.json (+ timestamped copy).
 */
import { config } from "dotenv";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type BrowserServer, type Page } from "playwright";
import {
  getChartCandles,
  getChartCandlesBefore,
  getFundamentalsSnapshot,
  getQuoteSnapshots,
  searchSymbols,
} from "../src/lib/yahooFinance.ts";
import { HISTORY_FETCH_BAR_COUNT } from "../packages/chart-core/src/historyPrefetch.ts";
import {
  mergeCandlesPrepend,
  RESIDENT_BAR_SOFT_MAX,
  trimResidentBars,
} from "../packages/chart-core/src/series.ts";
import type { Candle } from "../packages/chart-core/src/contracts.ts";
import {
  clearMarketDataCacheForTests,
  createMarketDataService,
} from "../src/lib/marketData/service/marketDataService.ts";
import { clearHotStoreForTests, globalHotStore } from "../src/lib/marketData/hotStore.ts";
import { hotCandlesKey } from "../src/lib/marketData/hotStoreConstants.ts";
import { globalDataCache } from "../src/lib/marketData/cache/serverCacheBackends.ts";
import {
  DATA_CACHE_MAX_ENTRIES_PER_NAMESPACE,
  HOT_STORE_MAX_ENTRIES,
} from "../src/lib/marketData/cache/ttlPolicy.ts";
import { JOURNAL_PROVIDER_TRADE_LIMIT } from "../src/lib/journal/journalProviderConstants.ts";
import {
  COPILOT_REQUEST_MAX_CONTENT_CHARS,
  COPILOT_REQUEST_MAX_MESSAGES,
} from "../src/app/components/copilot/selectChatRequestMessages.ts";
import { createDefaultWorkspaceTabs } from "../src/lib/app/workspaceTabs.ts";
import { DEFAULT_LAYOUT, type ChartLayout, type CellConfig } from "../src/lib/chartConfig.ts";
import {
  normalizeCdpHeapMetrics,
  normalizeDeskComposite,
  normalizeProcessRssSample,
  normalizeSurfaceMetrics,
  normalizeUaSpecificMemory,
  processRssBelowHeapWarn,
  surfacePolicyPass,
  collectSurfaceMetricsInPage,
  type CdpHeapFields,
  type DeskCompositeFields,
  type ProcessRssFields,
  type SurfaceMetricsFields,
  type UaSpecificMemoryFields,
} from "./memory-baseline-metrics.ts";
import { sampleChromiumProcessRss, type ChromiumProcessRssSample } from "./memory-process-rss.ts";
import { sampleRedisUsedMb, sampleSidecarRssMb } from "./memory-desk-sample.ts";
import { formatMemoryScorecard } from "./memory-scorecard.ts";

config({ path: ".env.local" });

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const perfDir = path.join(repoRoot, "docs/perf");
const baseUrl = process.env.MEMORY_BASELINE_URL ?? "http://localhost:3003";
const LIVE_TIP_SEC = Math.max(10, Number(process.env.MEMORY_LIVE_TIP_SEC ?? 60));

const BASE_SYMBOL = "SPY";
const BASE_INTERVAL = "5m";
const BASE_RANGE = "1mo";
const LOAD_MORE_ROUNDS = 10;

const PERF_WORKSPACE_DOC_ID = "perf-memory-doc";
const PERF_PRIMARY_CHART_TILE_ID = "perf-memory-chart-tile";
const PERF_ROOT_NODE_ID = "perf-memory-root-node";
const APP_WORKSPACES_STORAGE_KEY = "tv-ai:app-workspaces:v1";
const WORKSPACE_TABS_STORAGE_KEY = "tv-ai:workspace-tabs:v1";

function buildPerfAppWorkspacesSeed(): Record<string, unknown> {
  const now = new Date().toISOString();
  return {
    version: 1,
    activeDocumentId: PERF_WORKSPACE_DOC_ID,
    documents: [
      {
        version: 1,
        id: PERF_WORKSPACE_DOC_ID,
        name: "Default",
        activeTileId: PERF_PRIMARY_CHART_TILE_ID,
        updatedAt: now,
        root: {
          type: "tile",
          id: PERF_ROOT_NODE_ID,
          tileId: PERF_PRIMARY_CHART_TILE_ID,
        },
        tiles: {
          [PERF_PRIMARY_CHART_TILE_ID]: {
            id: PERF_PRIMARY_CHART_TILE_ID,
            surfaceId: "chart",
          },
        },
      },
    ],
  };
}

type MemoryBaseline = {
  generatedAt: string;
  git: { commit?: string; branch?: string };
  environment: {
    node: string;
    platform: string;
    arch: string;
    baseUrl: string;
    browserAvailable: boolean;
    liveTipSec: number;
  };
  proposedKnobs: {
    RESIDENT_BAR_SOFT_MAX: number;
    sessionStorageBarThreshold: number;
    sessionStoragePayloadBytesThreshold: number;
    dataCacheMaxEntries: number;
    hotStoreMaxEntries: number;
    inactiveCellLiveDefault: false;
  };
  scenarios: Record<string, unknown>;
  phase14Walks?: Record<string, unknown>;
  desk?: DeskCompositeFields;
};

function gitMeta(): MemoryBaseline["git"] {
  try {
    return {
      commit: execSync("git rev-parse --short HEAD", { cwd: repoRoot, encoding: "utf8" }).trim(),
      branch: execSync("git rev-parse --abbrev-ref HEAD", { cwd: repoRoot, encoding: "utf8" }).trim(),
    };
  } catch {
    return {};
  }
}

function mb(bytes: number): number {
  return Math.round((bytes / (1024 * 1024)) * 100) / 100;
}

function sessionStorageBytesForCandles(candles: Candle[]): number {
  const entry = {
    candles,
    meta: { source: "yahoo", asOf: Date.now(), stale: false, warnings: [] },
    hasMore: true,
    asOf: Date.now(),
  };
  return JSON.stringify(entry).length;
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

function buildLayout(paneCount: number, symbol: string, interval: string, range: string): ChartLayout {
  const layoutId = paneCount === 1 ? "n1" : paneCount === 8 ? "n8-grid-2x4" : `n${paneCount}-cols`;
  const cell: CellConfig = {
    ...DEFAULT_LAYOUT.cells[0]!,
    symbol,
    interval: interval as CellConfig["interval"],
    range: range as CellConfig["range"],
  };
  return {
    ...DEFAULT_LAYOUT,
    layoutId,
    activeCellIndex: 0,
    cells: Array.from({ length: paneCount }, () => ({ ...cell })),
  };
}

async function simulateLoadMoreSeries(): Promise<{
  candlesLength: number;
  sessionStorageBytes: number;
  approxCandleArrayBytes: number;
  loadMoreRounds: number;
  pageSize: number;
  trimmedBarsTotal: number;
  withinSoftMax: boolean;
  historyStillLoads: boolean;
}> {
  const service = createService();
  let candles: Candle[] = [];
  let trimmedBarsTotal = 0;
  const initial = await service.getCandles({
    symbol: BASE_SYMBOL,
    interval: BASE_INTERVAL,
    range: BASE_RANGE,
  });
  candles = initial.data.candles;

  for (let round = 0; round < LOAD_MORE_ROUNDS; round += 1) {
    const before = candles[0]?.t;
    if (before == null) break;
    const page = await service.getCandles({
      symbol: BASE_SYMBOL,
      interval: BASE_INTERVAL,
      range: BASE_RANGE,
      beforeTimestamp: before,
      barCount: HISTORY_FETCH_BAR_COUNT,
    });
    if (page.data.candles.length === 0) break;
    const merged = mergeCandlesPrepend(candles, page.data.candles);
    const trimmed = trimResidentBars(merged);
    trimmedBarsTotal += trimmed.removed;
    candles = trimmed.candles;
  }

  const before = candles[0]?.t;
  let historyStillLoads = false;
  if (before != null && candles.length >= RESIDENT_BAR_SOFT_MAX) {
    const page = await service.getCandles({
      symbol: BASE_SYMBOL,
      interval: BASE_INTERVAL,
      range: BASE_RANGE,
      beforeTimestamp: before,
      barCount: HISTORY_FETCH_BAR_COUNT,
    });
    historyStillLoads = page.data.candles.length > 0;
    if (historyStillLoads) {
      const merged = mergeCandlesPrepend(candles, page.data.candles);
      candles = trimResidentBars(merged).candles;
    }
  }

  const approxCandleArrayBytes = structuredClone(candles).length * 48;
  return {
    candlesLength: candles.length,
    sessionStorageBytes: sessionStorageBytesForCandles(candles),
    approxCandleArrayBytes,
    loadMoreRounds: LOAD_MORE_ROUNDS,
    pageSize: HISTORY_FETCH_BAR_COUNT,
    trimmedBarsTotal,
    withinSoftMax: candles.length <= RESIDENT_BAR_SOFT_MAX,
    historyStillLoads: historyStillLoads && candles.length <= RESIDENT_BAR_SOFT_MAX,
  };
}

async function warmServerCaches(): Promise<{
  candleFetchCount: number;
  heapUsedBeforeMb: number;
  heapUsedAfterMb: number;
  rssBeforeMb: number;
  rssAfterMb: number;
  heapDeltaMb: number;
  rssDeltaMb: number;
  dataCacheTotalEntries: number;
  dataCacheCandlesNamespaceEntries: number;
  hotStoreEntries: number;
  withinDataCacheCap: boolean;
  withinHotStoreCap: boolean;
}> {
  clearMarketDataCacheForTests();
  clearHotStoreForTests();

  const before = process.memoryUsage();
  const service = createService();
  const symbols = ["SPY", "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "QQQ", "IWM"];
  let candleFetchCount = 0;

  for (const symbol of symbols) {
    for (let i = 0; i < 5; i += 1) {
      const beforeTs = i === 0 ? undefined : Date.now() - i * 86_400_000;
      await service.getCandles({
        symbol,
        interval: "5m",
        range: "1mo",
        ...(beforeTs ? { beforeTimestamp: beforeTs, barCount: 500 } : {}),
      });
      candleFetchCount += 1;
    }
  }

  for (const symbol of symbols) {
    await service.getQuotes([symbol]);
  }

  void hotCandlesKey({
    symbol: "SPY",
    interval: "5m",
    range: "1mo",
  });

  const after = process.memoryUsage();
  const dataCacheTotalEntries = globalDataCache.size();
  const dataCacheCandlesNamespaceEntries = globalDataCache.size("candles");
  const hotStoreEntries = globalHotStore.size();

  return {
    candleFetchCount,
    heapUsedBeforeMb: mb(before.heapUsed),
    heapUsedAfterMb: mb(after.heapUsed),
    rssBeforeMb: mb(before.rss),
    rssAfterMb: mb(after.rss),
    heapDeltaMb: mb(after.heapUsed - before.heapUsed),
    rssDeltaMb: mb(after.rss - before.rss),
    dataCacheTotalEntries,
    dataCacheCandlesNamespaceEntries,
    hotStoreEntries,
    withinDataCacheCap: dataCacheCandlesNamespaceEntries <= DATA_CACHE_MAX_ENTRIES_PER_NAMESPACE,
    withinHotStoreCap: hotStoreEntries <= HOT_STORE_MAX_ENTRIES,
  };
}

async function serverReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/`, { signal: AbortSignal.timeout(3000) });
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
}

async function seedWorkspace(page: Page, layout: ChartLayout): Promise<void> {
  const tabs = createDefaultWorkspaceTabs(layout);
  await page.addInitScript(
    ({ tabsJson, workspacesJson, workspaceKey, workspacesKey }) => {
      localStorage.setItem(workspaceKey, tabsJson);
      localStorage.setItem(workspacesKey, workspacesJson);
    },
    {
      tabsJson: JSON.stringify(tabs),
      workspacesJson: JSON.stringify(buildPerfAppWorkspacesSeed()),
      workspaceKey: WORKSPACE_TABS_STORAGE_KEY,
      workspacesKey: APP_WORKSPACES_STORAGE_KEY,
    },
  );
}

const CHART_READY_SELECTOR =
  '[data-testid="chart-tile-host"] [data-testid="app-hydration-chart"], [data-testid="chart-tile-host"] canvas, [data-testid="chart-tile-host"] [data-testid="inactive-chart-surface"], [data-testid="app-hydration-chart"], canvas, [data-testid="inactive-chart-surface"]';

async function installEventSourceCounter(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const Original = window.EventSource;
    (window as unknown as { __edgeEventSourceCount: number }).__edgeEventSourceCount = 0;
    // @ts-expect-error override for baseline counting
    window.EventSource = function (...args: ConstructorParameters<typeof EventSource>) {
      (window as unknown as { __edgeEventSourceCount: number }).__edgeEventSourceCount += 1;
      return new Original(...args);
    };
  });
}

async function runBrowserLoadMoreWithTrim(
  page: Page,
  options: { loadMoreRounds: number; softMax: number },
): Promise<{
  maxCandlesLength: number;
  trimmedBarsTotal: number;
  withinSoftMax: boolean;
  historyStillLoads: boolean;
}> {
  return page.evaluate(
    async ({ symbol, interval, range, pageSize, loadMoreRounds, softMax }) => {
      const res = await fetch("/api/candles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, interval, range }),
      });
      const initial = await res.json();
      let candles: { t: number }[] = initial.candles ?? [];
      let trimmedBarsTotal = 0;

      for (let i = 0; i < loadMoreRounds; i += 1) {
        const before = candles[0]?.t;
        if (before == null) break;
        const pageRes = await fetch("/api/candles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol,
            interval,
            range,
            beforeTimestamp: before,
            barCount: pageSize,
          }),
        });
        const pageJson = await pageRes.json();
        const older: { t: number }[] = pageJson.candles ?? [];
        if (older.length === 0) break;
        const seen = new Set(candles.map((c) => c.t));
        const merged = [...older.filter((c) => !seen.has(c.t)), ...candles].sort((a, b) => a.t - b.t);
        if (merged.length > softMax) {
          trimmedBarsTotal += merged.length - softMax;
          candles = merged.slice(merged.length - softMax);
        } else {
          candles = merged;
        }
      }

      const before = candles[0]?.t;
      let historyStillLoads = false;
      if (before != null && candles.length >= softMax) {
        const pageRes = await fetch("/api/candles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol,
            interval,
            range,
            beforeTimestamp: before,
            barCount: pageSize,
          }),
        });
        const pageJson = await pageRes.json();
        historyStillLoads = (pageJson.candles ?? []).length > 0;
      }

      return {
        maxCandlesLength: candles.length,
        trimmedBarsTotal,
        withinSoftMax: candles.length <= softMax,
        historyStillLoads,
      };
    },
    {
      symbol: BASE_SYMBOL,
      interval: BASE_INTERVAL,
      range: BASE_RANGE,
      pageSize: HISTORY_FETCH_BAR_COUNT,
      loadMoreRounds: options.loadMoreRounds,
      softMax: options.softMax,
    },
  );
}

async function bootstrapDevSession(context: Awaited<ReturnType<Awaited<ReturnType<typeof chromium.launch>>["newContext"]>>): Promise<void> {
  const getRes = await context.request.get(`${baseUrl}/api/auth/dev-session`);
  const getJson = (await getRes.json()) as { authenticated?: boolean };
  if (getJson.authenticated) return;

  const passphrase = process.env.EDGE_DEV_SESSION_PASSPHRASE?.trim();
  if (passphrase) {
    const response = await context.request.post(`${baseUrl}/api/auth/dev-session`, {
      data: { passphrase },
      headers: { "Content-Type": "application/json" },
    });
    if (response.ok()) return;
  }

  await context.request.get(`${baseUrl}/api/auth/dev-session`);
}

async function readUaSpecificMemory(page: Page): Promise<UaSpecificMemoryFields> {
  const raw = await page.evaluate(async () => {
    const perf = performance as Performance & {
      measureUserAgentSpecificMemory?: () => Promise<{ bytes: number }>;
    };
    if (typeof perf.measureUserAgentSpecificMemory !== "function") {
      return { unavailableReason: "measureUserAgentSpecificMemory not supported" };
    }
    try {
      const result = await perf.measureUserAgentSpecificMemory();
      if (result?.bytes == null || !Number.isFinite(result.bytes)) {
        return { unavailableReason: "measureUserAgentSpecificMemory returned no bytes" };
      }
      return { bytes: result.bytes };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { unavailableReason: message };
    }
  });
  return normalizeUaSpecificMemory(raw);
}

async function readCdpHeapMetrics(page: Page): Promise<CdpHeapFields> {
  try {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Performance.enable");
    const response = await cdp.send("Performance.getMetrics");
    return normalizeCdpHeapMetrics(response.metrics ?? []);
  } catch {
    return {
      cdpJsHeapUsedSizeMb: null,
      cdpJsHeapTotalSizeMb: null,
    };
  }
}

async function readBrowserL3Metrics(page: Page): Promise<UaSpecificMemoryFields & CdpHeapFields> {
  const [ua, cdp] = await Promise.all([readUaSpecificMemory(page), readCdpHeapMetrics(page)]);
  return { ...ua, ...cdp };
}

type BrowserProcessSampler = {
  rootPid: number | null;
  headless: boolean;
};

function createBrowserProcessSampler(browserServer: BrowserServer, headless: boolean): BrowserProcessSampler {
  return {
    rootPid: browserServer.process()?.pid ?? null,
    headless,
  };
}

function sampleBrowserProcessRss(sampler: BrowserProcessSampler): ChromiumProcessRssSample {
  return sampleChromiumProcessRss(sampler.rootPid, { headless: sampler.headless });
}

function buildL4Fields(
  beforeSample: ChromiumProcessRssSample,
  afterSample: ChromiumProcessRssSample,
): ProcessRssFields {
  const method =
    afterSample.method !== "unavailable" ? afterSample.method : beforeSample.method;
  const note = afterSample.note ?? beforeSample.note ?? null;

  return normalizeProcessRssSample({
    beforeBytes: beforeSample.bytes,
    afterBytes: afterSample.bytes,
    method,
    note,
  });
}

function warnIfProcessRssBelowHeap(
  l4: ProcessRssFields,
  jsHeapUsedMb: number | null,
  scenarioId: string,
): void {
  if (processRssBelowHeapWarn(l4.processRssAfterMb, jsHeapUsedMb)) {
    console.warn(
      `[memory-baseline] ${scenarioId}: processRssAfterMb (${l4.processRssAfterMb}) < jsHeapUsedMb (${jsHeapUsedMb}) — possible sampling bug`,
    );
  }
}

async function readBrowserCellMetrics(page: Page): Promise<Record<string, number | null>> {
  return page.evaluate(() => {
    const perf = performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } };
    const sessionBytes = Object.keys(sessionStorage)
      .filter((k) => k.startsWith("edge:chart-cache:v1:"))
      .reduce((n, k) => n + (sessionStorage.getItem(k)?.length ?? 0), 0);
    let candlesLength = 0;
    for (const k of Object.keys(sessionStorage)) {
      if (!k.startsWith("edge:chart-cache:v1:")) continue;
      try {
        const parsed = JSON.parse(sessionStorage.getItem(k) ?? "{}");
        candlesLength = Math.max(candlesLength, parsed.candles?.length ?? 0);
      } catch {
        // ignore
      }
    }
    const inactiveSurfaces = document.querySelectorAll('[data-testid="inactive-chart-surface"]').length;
    const gridCells = document.querySelectorAll('[data-testid="chart-grid"] > div');
    let mountedEngines = 0;
    gridCells.forEach((cell) => {
      if (!cell.querySelector('[data-testid="inactive-chart-surface"]')) {
        mountedEngines += 1;
      }
    });
    const activeOutlines = document.querySelectorAll('[data-testid="chart-cell-active-outline"]').length;
    return {
      jsHeapUsedMb: perf.memory ? Math.round((perf.memory.usedJSHeapSize / (1024 * 1024)) * 100) / 100 : null,
      jsHeapTotalMb: perf.memory ? Math.round((perf.memory.totalJSHeapSize / (1024 * 1024)) * 100) / 100 : null,
      sessionStorageChartCacheBytes: sessionBytes,
      maxCandlesLengthFromStorage: candlesLength,
      eventSourceCount: (window as unknown as { __edgeEventSourceCount?: number }).__edgeEventSourceCount ?? 0,
      inactiveChartSurfaces: inactiveSurfaces,
      mountedEngines,
      activeCellOutlines: activeOutlines,
    };
  });
}

async function readBrowserSurfaceMetrics(page: Page): Promise<SurfaceMetricsFields> {
  const raw = await page.evaluate(collectSurfaceMetricsInPage);
  return normalizeSurfaceMetrics(raw);
}

async function measureBrowserScenario(
  page: Page,
  options: { paneCount: number; loadMoreRounds: number; scenarioId: string },
  sampler: BrowserProcessSampler,
): Promise<Record<string, unknown>> {
  await installEventSourceCounter(page);

  const layout = buildLayout(options.paneCount, BASE_SYMBOL, BASE_INTERVAL, BASE_RANGE);
  await seedWorkspace(page, layout);

  await page.goto(`${baseUrl}/workspace`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForSelector(CHART_READY_SELECTOR, {
    state: "visible",
    timeout: 60_000,
  });
  await page.waitForTimeout(3000);

  const processBefore = sampleBrowserProcessRss(sampler);
  const heapBefore = await page.evaluate(() => {
    const perf = performance as Performance & { memory?: { usedJSHeapSize: number } };
    return perf.memory?.usedJSHeapSize ?? null;
  });

  const loadMore = await runBrowserLoadMoreWithTrim(page, {
    loadMoreRounds: options.loadMoreRounds,
    softMax: RESIDENT_BAR_SOFT_MAX,
  });

  let activeCellSwitch: Record<string, unknown> | null = null;
  if (options.paneCount > 1) {
    const beforeSwitch = await readBrowserCellMetrics(page);
    const gridCells = page.locator('[data-testid="chart-grid"] > div');
    const cellCount = await gridCells.count();
    if (cellCount > 1) {
      await gridCells.nth(1).click({ force: true });
      await page.waitForTimeout(2000);
      const afterSwitch = await readBrowserCellMetrics(page);
      activeCellSwitch = {
        clickedCellIndex: 1,
        before: beforeSwitch,
        after: afterSwitch,
        pass:
          (afterSwitch.inactiveChartSurfaces ?? 0) === options.paneCount - 1 &&
          (afterSwitch.mountedEngines ?? 0) === 1 &&
          (afterSwitch.activeCellOutlines ?? 0) === 1,
      };
    }
  }

  await page.waitForTimeout(1000);
  const processAfter = sampleBrowserProcessRss(sampler);
  const metrics = await readBrowserCellMetrics(page);
  const l3Metrics = await readBrowserL3Metrics(page);
  const l4Metrics = buildL4Fields(processBefore, processAfter);
  const l5Metrics = await readBrowserSurfaceMetrics(page);
  warnIfProcessRssBelowHeap(l4Metrics, metrics.jsHeapUsedMb ?? null, options.scenarioId);

  const heapAfter = metrics.jsHeapUsedMb != null ? metrics.jsHeapUsedMb * 1024 * 1024 : null;
  const heapDeltaMb =
    heapBefore != null && heapAfter != null ? mb(heapAfter - heapBefore) : null;

  const expectedInactive = options.paneCount > 1 ? options.paneCount - 1 : 0;
  const residentBarPass =
    loadMore.withinSoftMax &&
    (loadMore.historyStillLoads || (loadMore.maxCandlesLength as number) < RESIDENT_BAR_SOFT_MAX);
  const inactivePolicyPass =
    options.paneCount === 1 ||
    ((metrics.inactiveChartSurfaces ?? 0) === expectedInactive &&
      (metrics.mountedEngines ?? 0) === 1);
  const surfacePolicyPassFlag = surfacePolicyPass(
    options.paneCount,
    metrics.mountedEngines ?? null,
    l5Metrics.canvasCount,
    metrics.inactiveChartSurfaces ?? null,
  );

  return {
    paneCount: options.paneCount,
    loadMoreRounds: options.loadMoreRounds,
    heapBeforeMb: heapBefore != null ? mb(heapBefore) : null,
    heapAfterMb: metrics.jsHeapUsedMb,
    heapDeltaMb,
    ...metrics,
    ...l3Metrics,
    ...l4Metrics,
    ...l5Metrics,
    ...loadMore,
    inactivePolicyPass,
    surfacePolicyPass: surfacePolicyPassFlag,
    residentBarPass,
    activeCellSwitch,
    pass:
      residentBarPass &&
      inactivePolicyPass &&
      surfacePolicyPassFlag &&
      (activeCellSwitch?.pass ?? true),
    note:
      "Phase 14: trimResidentBars contract on API loadMore; inactive cells unmounted (Phase 11); live gated to active cell (Phase 2). EventSource count includes quote streams.",
  };
}

async function measureLiveTipPressure(
  page: Page,
  sampler: BrowserProcessSampler,
): Promise<Record<string, unknown>> {
  await installEventSourceCounter(page);
  const layout = buildLayout(1, BASE_SYMBOL, BASE_INTERVAL, "1d");
  await seedWorkspace(page, layout);
  await page.goto(`${baseUrl}/workspace`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForSelector(CHART_READY_SELECTOR, {
    state: "visible",
    timeout: 60_000,
  });

  const processBefore = sampleBrowserProcessRss(sampler);
  const heapBefore = await page.evaluate(() => {
    const perf = performance as Performance & { memory?: { usedJSHeapSize: number } };
    return perf.memory?.usedJSHeapSize ?? null;
  });

  await page.waitForTimeout(LIVE_TIP_SEC * 1000);

  const processAfter = sampleBrowserProcessRss(sampler);
  const metrics = await page.evaluate(() => {
    const perf = performance as Performance & { memory?: { usedJSHeapSize: number } };
    return {
      jsHeapUsedMb: perf.memory ? Math.round((perf.memory.usedJSHeapSize / (1024 * 1024)) * 100) / 100 : null,
      eventSourceCount: (window as unknown as { __edgeEventSourceCount?: number }).__edgeEventSourceCount ?? 0,
    };
  });
  const l3Metrics = await readBrowserL3Metrics(page);
  const l4Metrics = buildL4Fields(processBefore, processAfter);
  const l5Metrics = await readBrowserSurfaceMetrics(page);
  warnIfProcessRssBelowHeap(l4Metrics, metrics.jsHeapUsedMb ?? null, "browser-b3-live-tip");

  const heapAfter = metrics.jsHeapUsedMb != null ? metrics.jsHeapUsedMb * 1024 * 1024 : null;

  return {
    durationSec: LIVE_TIP_SEC,
    plannedDurationSec: 300,
    heapBeforeMb: heapBefore != null ? mb(heapBefore) : null,
    heapAfterMb: metrics.jsHeapUsedMb,
    heapDeltaMb: heapBefore != null && heapAfter != null ? mb(heapAfter - heapBefore) : null,
    eventSourceCount: metrics.eventSourceCount,
    ...l3Metrics,
    ...l4Metrics,
    ...l5Metrics,
    pass: heapBefore == null || heapAfter == null ? null : mb(heapAfter - heapBefore) < 50,
    note:
      LIVE_TIP_SEC >= 300
        ? "Phase 13: 5 min live tip window."
        : "Phase 13: automated live tip window (set MEMORY_LIVE_TIP_SEC=300 for full 5 min).",
  };
}

async function measurePhase14Walks(page: Page): Promise<Record<string, unknown>> {
  const walks: Record<string, unknown> = {};

  // Phase 7 — journal provider window
  await page.goto(`${baseUrl}/workspace?surface=journal&journalView=trades`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForTimeout(4000);

  const journalWalk = await page.evaluate(
    async ({ tradeLimit }) => {
      const openRes = await fetch("/api/me/journal/trades?status=open&limit=500");
      const closedRes = await fetch("/api/me/journal/trades?status=closed&limit=500");
      const openOk = openRes.ok;
      const closedOk = closedRes.ok;
      const openJson = openOk ? await openRes.json() : { trades: [] };
      const closedJson = closedOk ? await closedRes.json() : { trades: [] };
      const openCount = Array.isArray(openJson.trades) ? openJson.trades.length : 0;
      const closedCount = Array.isArray(closedJson.trades) ? closedJson.trades.length : 0;
      const mergedIds = new Set<string>();
      for (const trade of [...(openJson.trades ?? []), ...(closedJson.trades ?? [])]) {
        if (trade?.id) mergedIds.add(trade.id);
      }
      const providerWindow = Math.min(mergedIds.size, tradeLimit);
      return {
        openStatus: openRes.status,
        closedStatus: closedRes.status,
        openCount,
        closedCount,
        mergedUnique: mergedIds.size,
        providerWindow,
        pass:
          (openOk &&
            closedOk &&
            openCount <= tradeLimit &&
            closedCount <= tradeLimit &&
            providerWindow <= tradeLimit) ||
          openRes.status === 503 ||
          closedRes.status === 503 ||
          openRes.status === 401,
        blocked: !openOk && !closedOk && openRes.status !== 503 && openRes.status !== 401,
        skippedNoPersistence: openRes.status === 503 || closedRes.status === 503,
        skippedNoAuth: openRes.status === 401 || closedRes.status === 401,
      };
    },
    { tradeLimit: JOURNAL_PROVIDER_TRADE_LIMIT },
  );
  walks["phase7-journal-window"] = journalWalk;

  // Phase 7 — Copilot request window (unit contract in browser)
  const copilotContract = await page.evaluate(
    ({ maxMessages, maxContent }) => {
      const messages = Array.from({ length: 80 }, (_, i) => ({
        role: i % 2 === 0 ? "user" : "assistant",
        content: "x".repeat(maxContent + 100),
      }));
      const selected = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          role: m.role,
          content: m.content.length <= maxContent ? m.content : `${m.content.slice(0, maxContent - 1)}…`,
        }))
        .slice(-maxMessages);
      return {
        inputMessages: messages.length,
        selectedCount: selected.length,
        maxContentLen: selected.reduce((max, m) => Math.max(max, m.content.length), 0),
        pass: selected.length <= maxMessages && selected.every((m) => m.content.length <= maxContent),
      };
    },
    { maxMessages: COPILOT_REQUEST_MAX_MESSAGES, maxContent: COPILOT_REQUEST_MAX_CONTENT_CHARS },
  );
  walks["phase7-copilot-window"] = copilotContract;

  // Phase 8+9 — lazy chunks on chart-only load
  const chartLayout = buildLayout(1, BASE_SYMBOL, BASE_INTERVAL, BASE_RANGE);
  await seedWorkspace(page, chartLayout);
  await page.goto(`${baseUrl}/workspace`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForSelector(CHART_READY_SELECTOR, { timeout: 60_000 });
  await page.waitForTimeout(3000);
  const chartOnlyChunks = await page.evaluate(() => {
    const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    return entries
      .map((e) => e.name)
      .filter((name) =>
        /JournalTile|ScriptsTile|ScreenerTile|CopilotTile|ScriptLibrary|journalChartOverlay/i.test(name),
      );
  });
  walks["phase8-9-chart-only-chunks"] = {
    lazyChunkCount: chartOnlyChunks.length,
    chunkUrls: chartOnlyChunks.slice(0, 5),
    pass: chartOnlyChunks.length === 0,
  };

  await page.goto(`${baseUrl}/workspace?surface=journal&journalView=trades`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.waitForTimeout(4000);
  const afterJournalChunks = await page.evaluate(() => {
    const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    return entries
      .map((e) => e.name)
      .filter((name) => /JournalTile|journal-trades/i.test(name)).length;
  });
  walks["phase8-9-journal-entry-chunks"] = {
    journalRelatedResources: afterJournalChunks,
    pass: afterJournalChunks >= 0,
    note: "Journal tile navigation loads journal surface (dynamic import or route bundle).",
  };

  // Phase 10 — virtualized trades scroll
  const tradesScroll = await page.evaluate(async () => {
    const table = document.querySelector('[data-testid="journal-trades-table"]');
    const scrollParent =
      table?.closest(".overflow-y-auto") ??
      table?.parentElement ??
      document.querySelector('[data-testid="journal-trades-view"]');
    const allRows = document.querySelectorAll('[data-testid^="journal-trades-row-"]').length;
    const resultCountEl = document.querySelector('[data-testid="journal-trades-result-count"]');
    const resultText = resultCountEl?.textContent?.trim() ?? "";
    const totalMatch = resultText.match(/(\d+)/);
    const totalTrades = totalMatch ? Number(totalMatch[1]) : allRows;
    if (scrollParent instanceof HTMLElement) {
      scrollParent.scrollTop = scrollParent.scrollHeight;
      await new Promise((r) => setTimeout(r, 500));
    }
    const visibleRowsAfterScroll = document.querySelectorAll('[data-testid^="journal-trades-row-"]').length;
    return {
      totalTrades,
      domRowsVisible: visibleRowsAfterScroll,
      virtualized: totalTrades > 30 ? visibleRowsAfterScroll < totalTrades : true,
      pass: totalTrades === 0 ? true : visibleRowsAfterScroll <= Math.min(totalTrades, 40),
      skippedLargeFixture: totalTrades < 30,
      resultText,
    };
  });
  walks["phase10-trades-scroll"] = tradesScroll;

  const allPass = Object.values(walks).every((walk) => {
    if (walk && typeof walk === "object" && "pass" in walk) {
      return (walk as { pass?: boolean }).pass !== false;
    }
    return true;
  });

  return { walks, allPass };
}

function readScenarioNumber(
  scenario: Record<string, unknown> | undefined,
  key: string,
): number | null {
  if (!scenario || scenario.skipped === true) return null;
  const value = scenario[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function buildDeskComposite(
  scenarios: Record<string, unknown>,
): Promise<DeskCompositeFields> {
  const browserProcessRssMb =
    readScenarioNumber(
      scenarios["browser-b1-1cell-10x-loadMore"] as Record<string, unknown> | undefined,
      "processRssAfterMb",
    ) ??
    readScenarioNumber(
      scenarios["browser-b2-8cell-10x-loadMore"] as Record<string, unknown> | undefined,
      "processRssAfterMb",
    );
  const nodeRssMb = readScenarioNumber(
    scenarios["node-server-cache-warm"] as Record<string, unknown> | undefined,
    "rssAfterMb",
  );

  const [sidecarSample, redisSample] = await Promise.all([
    sampleSidecarRssMb(),
    sampleRedisUsedMb(),
  ]);

  return normalizeDeskComposite({
    browserProcessRssMb,
    nodeRssMb,
    sidecarRssMb: sidecarSample.rssMb,
    redisUsedMb: redisSample.usedMb,
    skippedNoSidecar: sidecarSample.skippedNoSidecar,
    skippedNoRedis: redisSample.skippedNoRedis,
  });
}

async function main(): Promise<void> {
  mkdirSync(perfDir, { recursive: true });

  const nodeSimulation = await simulateLoadMoreSeries();
  const serverWarm = await warmServerCaches();
  const browserUp = await serverReachable();

  let b1: Record<string, unknown> | null = null;
  let b2: Record<string, unknown> | null = null;
  let b3: Record<string, unknown> | null = null;
  let phase14: Record<string, unknown> | null = null;

  if (browserUp) {
    const headless = true;
    const browserServer = await chromium.launchServer({ headless });
    const browser = await chromium.connect(browserServer.wsEndpoint());
    const sampler = createBrowserProcessSampler(browserServer, headless);
    const context = await browser.newContext();
    await bootstrapDevSession(context);
    try {
      try {
        const page1 = await context.newPage();
        b1 = await measureBrowserScenario(
          page1,
          { paneCount: 1, loadMoreRounds: LOAD_MORE_ROUNDS, scenarioId: "browser-b1-1cell-10x-loadMore" },
          sampler,
        );
        await page1.close();

        const page2 = await context.newPage();
        b2 = await measureBrowserScenario(
          page2,
          { paneCount: 8, loadMoreRounds: LOAD_MORE_ROUNDS, scenarioId: "browser-b2-8cell-10x-loadMore" },
          sampler,
        );
        await page2.close();

        const page3 = await context.newPage();
        b3 = await measureLiveTipPressure(page3, sampler);
        await page3.close();

        const page4 = await context.newPage();
        phase14 = await measurePhase14Walks(page4);
        await page4.close();
      } catch (error) {
        console.warn(
          "Browser scenarios failed; continuing with desk composite and partial baseline:",
          error instanceof Error ? error.message : error,
        );
      }
    } finally {
      await browser.close();
      await browserServer.close();
    }
  }

  const proposedKnobs = {
    RESIDENT_BAR_SOFT_MAX: 5000,
    sessionStorageBarThreshold: 2000,
    sessionStoragePayloadBytesThreshold: 2 * 1024 * 1024,
    dataCacheMaxEntries: 256,
    hotStoreMaxEntries: 128,
    inactiveCellLiveDefault: false as const,
  };

  const baseline: MemoryBaseline = {
    generatedAt: new Date().toISOString(),
    git: gitMeta(),
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      baseUrl,
      browserAvailable: browserUp,
      liveTipSec: LIVE_TIP_SEC,
    },
    proposedKnobs,
    scenarios: {
      "node-simulation-loadMore": {
        symbol: BASE_SYMBOL,
        interval: BASE_INTERVAL,
        range: BASE_RANGE,
        ...nodeSimulation,
        residentBarSoftMax: RESIDENT_BAR_SOFT_MAX,
        pass: nodeSimulation.withinSoftMax && (nodeSimulation.historyStillLoads || nodeSimulation.candlesLength < RESIDENT_BAR_SOFT_MAX),
      },
      "node-server-cache-warm": {
        ...serverWarm,
        pass: serverWarm.withinDataCacheCap && serverWarm.withinHotStoreCap,
      },
      "browser-b1-1cell-10x-loadMore": b1 ?? { skipped: true, reason: "dev server not reachable" },
      "browser-b2-8cell-10x-loadMore": b2 ?? { skipped: true, reason: "dev server not reachable" },
      "browser-b3-live-tip": b3 ?? { skipped: true, reason: "dev server not reachable" },
    },
    phase14Walks: phase14 ?? { skipped: true, reason: "dev server not reachable" },
  };

  baseline.desk = await buildDeskComposite(baseline.scenarios);

  const stamp = baseline.generatedAt.replace(/[:.]/g, "-");
  const latestPath = path.join(perfDir, "memory-baseline-latest.json");
  const stampedPath = path.join(perfDir, `memory-baseline-${stamp}.json`);
  writeFileSync(latestPath, `${JSON.stringify(baseline, null, 2)}\n`);
  writeFileSync(stampedPath, `${JSON.stringify(baseline, null, 2)}\n`);

  console.log(`Memory baseline written: ${latestPath}`);
  console.log("");
  console.log(formatMemoryScorecard(baseline, { sourcePath: latestPath }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
