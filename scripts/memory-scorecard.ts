import type { DeskCompositeFields } from "./memory-baseline-metrics.ts";

export type BrowserScenarioFields = {
  skipped?: boolean;
  reason?: string;
  jsHeapUsedMb?: number | null;
  heapDeltaMb?: number | null;
  processRssAfterMb?: number | null;
  maxCandlesLength?: number | null;
  mountedEngines?: number | null;
  withinSoftMax?: boolean | null;
};

export type SoakScenarioFields = {
  skipped?: boolean;
  reason?: string;
  soakDurationSec?: number | null;
  soakHeapDeltaMb?: number | null;
  soakProcessRssDeltaMb?: number | null;
  eventSourceCountBefore?: number | null;
  eventSourceCountAfter?: number | null;
  eventSourceCountStable?: boolean | null;
};

export type NodeCacheWarmFields = {
  rssAfterMb?: number | null;
  withinDataCacheCap?: boolean | null;
  withinHotStoreCap?: boolean | null;
};

export type MemoryBaselineSnapshot = {
  generatedAt?: string;
  scenarios?: Record<string, unknown>;
  desk?: DeskCompositeFields;
};

export type MemoryScorecardRow = {
  tabMb: number | null;
  heapMb: number | null;
  heapDeltaMb: number | null;
  candles: number | null;
  engines: number | null;
  nodeRssMb: number | null;
  sidecarRssMb: number | null;
  capsOk: boolean | null;
  browserScenario: string | null;
};

export type MemorySoftBudget = {
  id: string;
  message: string;
};

export type MemorySoftBudgetConfig = {
  heapDeltaMb: number;
  processRssMb: number;
  deskTotalMb: number;
  soakHeapDeltaMb: number;
  soakProcessRssDeltaMb: number;
};

export const DEFAULT_SOFT_BUDGETS: MemorySoftBudgetConfig = {
  heapDeltaMb: 50,
  processRssMb: 1200,
  deskTotalMb: 2500,
  soakHeapDeltaMb: 50,
  soakProcessRssDeltaMb: 100,
};

const SOAK_SEC_MIN = 10;
const SOAK_SEC_DEFAULT = 60;

function asBrowserScenario(value: unknown): BrowserScenarioFields | null {
  if (value == null || typeof value !== "object") return null;
  const row = value as BrowserScenarioFields;
  if (row.skipped) return null;
  return row;
}

function asNodeCacheWarm(value: unknown): NodeCacheWarmFields | null {
  if (value == null || typeof value !== "object") return null;
  const row = value as NodeCacheWarmFields & { skipped?: boolean };
  if (row.skipped) return null;
  return row;
}

function asSoakScenario(value: unknown): SoakScenarioFields | null {
  if (value == null || typeof value !== "object") return null;
  const row = value as SoakScenarioFields;
  if (row.skipped) return null;
  return row;
}

function formatMb(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return String(value);
}

function formatCount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return String(value);
}

function formatCapsOk(value: boolean | null): string {
  if (value == null) return "—";
  return value ? "yes" : "no";
}

function parsePositiveNumber(value: string | undefined, fallback: number): number {
  if (value == null || value.trim().length === 0) return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function readSoftBudgetConfig(
  env: NodeJS.ProcessEnv = process.env,
): MemorySoftBudgetConfig {
  return {
    heapDeltaMb: parsePositiveNumber(env.MEMORY_BUDGET_HEAP_DELTA_MB, DEFAULT_SOFT_BUDGETS.heapDeltaMb),
    processRssMb: parsePositiveNumber(env.MEMORY_BUDGET_PROCESS_RSS_MB, DEFAULT_SOFT_BUDGETS.processRssMb),
    deskTotalMb: parsePositiveNumber(env.MEMORY_BUDGET_DESK_TOTAL_MB, DEFAULT_SOFT_BUDGETS.deskTotalMb),
    soakHeapDeltaMb: parsePositiveNumber(
      env.MEMORY_BUDGET_SOAK_HEAP_DELTA_MB,
      DEFAULT_SOFT_BUDGETS.soakHeapDeltaMb,
    ),
    soakProcessRssDeltaMb: parsePositiveNumber(
      env.MEMORY_BUDGET_SOAK_PROCESS_RSS_DELTA_MB,
      DEFAULT_SOFT_BUDGETS.soakProcessRssDeltaMb,
    ),
  };
}

export function resolveSoakSec(env: NodeJS.ProcessEnv = process.env): number {
  const soakParsed = Number.parseFloat(env.MEMORY_SOAK_SEC ?? "");
  if (Number.isFinite(soakParsed) && soakParsed > 0) {
    return Math.max(SOAK_SEC_MIN, Math.floor(soakParsed));
  }

  const liveTipParsed = Number.parseFloat(env.MEMORY_LIVE_TIP_SEC ?? "");
  if (Number.isFinite(liveTipParsed) && liveTipParsed > 0) {
    return Math.max(SOAK_SEC_MIN, Math.floor(liveTipParsed));
  }

  return SOAK_SEC_DEFAULT;
}

export function evaluateSoakPass(
  soak: Pick<SoakScenarioFields, "soakHeapDeltaMb" | "soakProcessRssDeltaMb">,
  config: MemorySoftBudgetConfig = readSoftBudgetConfig(),
): boolean | null {
  const { soakHeapDeltaMb, soakProcessRssDeltaMb } = soak;
  if (soakHeapDeltaMb == null || soakProcessRssDeltaMb == null) {
    return null;
  }

  return (
    soakHeapDeltaMb <= config.soakHeapDeltaMb &&
    soakProcessRssDeltaMb <= config.soakProcessRssDeltaMb
  );
}

export function evaluateSoakBudgets(
  soak: SoakScenarioFields | null,
  config: MemorySoftBudgetConfig = readSoftBudgetConfig(),
): MemorySoftBudget[] {
  if (soak == null) return [];

  const warnings: MemorySoftBudget[] = [];

  if (soak.soakHeapDeltaMb != null && soak.soakHeapDeltaMb > config.soakHeapDeltaMb) {
    warnings.push({
      id: "soak-heap-delta",
      message: `soft-budget: soakHeapDeltaMb=${soak.soakHeapDeltaMb} exceeds ${config.soakHeapDeltaMb}`,
    });
  }

  if (soak.soakProcessRssDeltaMb != null && soak.soakProcessRssDeltaMb > config.soakProcessRssDeltaMb) {
    warnings.push({
      id: "soak-process-rss-delta",
      message: `soft-budget: soakProcessRssDeltaMb=${soak.soakProcessRssDeltaMb} exceeds ${config.soakProcessRssDeltaMb}`,
    });
  }

  return warnings;
}

export function selectBrowserScenario(
  scenarios: Record<string, unknown> | undefined,
): { scenario: BrowserScenarioFields; key: string } | null {
  if (!scenarios) return null;

  const b1 = asBrowserScenario(scenarios["browser-b1-1cell-10x-loadMore"]);
  if (b1) return { scenario: b1, key: "browser-b1-1cell-10x-loadMore" };

  const b2 = asBrowserScenario(scenarios["browser-b2-8cell-10x-loadMore"]);
  if (b2) return { scenario: b2, key: "browser-b2-8cell-10x-loadMore" };

  return null;
}

export function computeCapsOk(
  browser: BrowserScenarioFields | null,
  nodeWarm: NodeCacheWarmFields | null,
): boolean | null {
  const browserCaps = browser?.withinSoftMax;
  const dataCacheCap = nodeWarm?.withinDataCacheCap;
  const hotStoreCap = nodeWarm?.withinHotStoreCap;

  if (browserCaps == null && dataCacheCap == null && hotStoreCap == null) {
    return null;
  }

  return Boolean(browserCaps) && Boolean(dataCacheCap ?? true) && Boolean(hotStoreCap ?? true);
}

export function buildMemoryScorecardRow(baseline: MemoryBaselineSnapshot): MemoryScorecardRow {
  const browserSelection = selectBrowserScenario(baseline.scenarios);
  const browser = browserSelection?.scenario ?? null;
  const nodeWarm = asNodeCacheWarm(baseline.scenarios?.["node-server-cache-warm"]);
  const desk = baseline.desk;

  return {
    tabMb: browser?.processRssAfterMb ?? null,
    heapMb: browser?.jsHeapUsedMb ?? null,
    heapDeltaMb: browser?.heapDeltaMb ?? null,
    candles: browser?.maxCandlesLength ?? null,
    engines: browser?.mountedEngines ?? null,
    nodeRssMb: nodeWarm?.rssAfterMb ?? desk?.nodeRssMb ?? null,
    sidecarRssMb: desk?.sidecarRssMb ?? null,
    capsOk: computeCapsOk(browser, nodeWarm),
    browserScenario: browserSelection?.key ?? null,
  };
}

export function evaluateSoftBudgets(
  baseline: MemoryBaselineSnapshot,
  config: MemorySoftBudgetConfig = readSoftBudgetConfig(),
): MemorySoftBudget[] {
  const row = buildMemoryScorecardRow(baseline);
  const warnings: MemorySoftBudget[] = [];

  if (row.heapDeltaMb != null && row.heapDeltaMb > config.heapDeltaMb) {
    warnings.push({
      id: "heap-delta",
      message: `soft-budget: heapDeltaMb=${row.heapDeltaMb} exceeds ${config.heapDeltaMb}`,
    });
  }

  if (row.tabMb != null && row.tabMb > config.processRssMb) {
    warnings.push({
      id: "process-rss",
      message: `soft-budget: processRssAfterMb=${row.tabMb} exceeds ${config.processRssMb}`,
    });
  }

  const deskTotal = baseline.desk?.totalKnownMb;
  if (deskTotal != null && deskTotal > config.deskTotalMb) {
    warnings.push({
      id: "desk-total",
      message: `soft-budget: desk.totalKnownMb=${deskTotal} exceeds ${config.deskTotalMb}`,
    });
  }

  if (row.capsOk === false) {
    warnings.push({
      id: "caps",
      message: "soft-budget: caps (withinSoftMax / withinDataCacheCap / withinHotStoreCap) failed",
    });
  }

  const soak = asSoakScenario(baseline.scenarios?.["browser-b3-live-tip"]);
  warnings.push(...evaluateSoakBudgets(soak, config));

  return warnings;
}

function formatSoakStable(value: boolean | null | undefined): string {
  if (value == null) return "—";
  return value ? "yes" : "no";
}

export function formatSoakScorecardLine(soak: SoakScenarioFields | null): string | null {
  if (soak == null) return null;

  return `Soak (L9): duration=${formatCount(soak.soakDurationSec)}s Δheap=${formatMb(soak.soakHeapDeltaMb)} Δprocess=${formatMb(soak.soakProcessRssDeltaMb)} EventSource stable=${formatSoakStable(soak.eventSourceCountStable)}`;
}

export function formatMemoryScorecard(
  baseline: MemoryBaselineSnapshot,
  options?: { sourcePath?: string },
): string {
  const row = buildMemoryScorecardRow(baseline);
  const desk = baseline.desk;
  const lines: string[] = [];

  lines.push("Memory scorecard (L1–L8)");
  if (options?.sourcePath) {
    lines.push(`Source: ${options.sourcePath}`);
  }
  if (baseline.generatedAt) {
    lines.push(`Generated: ${baseline.generatedAt}`);
  }
  if (row.browserScenario) {
    lines.push(`Browser scenario: ${row.browserScenario}`);
  }

  lines.push("");
  lines.push("| Tab MB (L4) | Heap MB (L2) | Δ Heap | Candles (L1) | Engines (L1) | Node RSS (L6) | Sidecar RSS (L7) | Caps OK (L1) |");
  lines.push("|-------------|--------------|--------|----------------|--------------|---------------|------------------|--------------|");
  lines.push(
    `| ${formatMb(row.tabMb)} | ${formatMb(row.heapMb)} | ${formatMb(row.heapDeltaMb)} | ${formatCount(row.candles)} | ${formatCount(row.engines)} | ${formatMb(row.nodeRssMb)} | ${formatMb(row.sidecarRssMb)} | ${formatCapsOk(row.capsOk)} |`,
  );

  if (desk) {
    lines.push("");
    const skipParts: string[] = [];
    if (desk.skippedNoSidecar) skipParts.push("sidecar skipped");
    if (desk.skippedNoRedis) skipParts.push("redis skipped");
    const skipSuffix = skipParts.length > 0 ? ` (${skipParts.join(", ")})` : "";
    lines.push(
      `Desk: totalKnownMb=${formatMb(desk.totalKnownMb)} browser=${formatMb(desk.browserProcessRssMb)} node=${formatMb(desk.nodeRssMb)} sidecar=${formatMb(desk.sidecarRssMb)} redis=${formatMb(desk.redisUsedMb)}${skipSuffix}`,
    );
  }

  const soakLine = formatSoakScorecardLine(asSoakScenario(baseline.scenarios?.["browser-b3-live-tip"]));
  if (soakLine) {
    lines.push("");
    lines.push(soakLine);
  }

  const warnings = evaluateSoftBudgets(baseline);
  if (warnings.length > 0) {
    lines.push("");
    lines.push("Soft budget warnings:");
    for (const warning of warnings) {
      lines.push(`- ${warning.message}`);
    }
  }

  return lines.join("\n");
}
