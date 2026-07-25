import { execSync, spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { runMicrobenchmarks } from "../examples/chart-perf-harness/src/microbench.ts";
import type { PerfBaseline, ScenarioResult } from "../examples/chart-perf-harness/src/types.ts";
import {
  applyChartPerfBudgetGate,
  readChartPerfBudgetConfig,
  type ChartPerfBaseline,
} from "./chart-perf-budgets.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const exampleDir = path.join(repoRoot, "examples/chart-perf-harness");
const perfDir = path.join(repoRoot, "docs/perf");
const previewPort = 5199;
const previewUrl = `http://127.0.0.1:${previewPort}/?autorun=1`;

const INTERACTION_SCENARIO_IDS = new Set([
  "interaction-100k-pan-only",
  "interaction-100k-zoom-only",
  "interaction-100k-crosshair-only",
  "interaction-100k-pan-zoom-sample",
  "interaction-100k-pan-zoom-drawings-20",
  "interaction-5k-crosshair-only",
  "interaction-5k-pan-zoom",
  "interaction-5k-pan-zoom-drawings-20",
  "interaction-5k-tip-tick",
  "indicators-compute-tip-tick-5k-core-six",
]);

function gitMeta(): PerfBaseline["git"] {
  try {
    return {
      commit: execSync("git rev-parse --short HEAD", { cwd: repoRoot, encoding: "utf8" }).trim(),
      branch: execSync("git rev-parse --abbrev-ref HEAD", { cwd: repoRoot, encoding: "utf8" }).trim(),
    };
  } catch {
    return {};
  }
}

async function waitForServer(url: string, timeoutMs = 45_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function stopServer(server: ChildProcess): void {
  server.kill("SIGTERM");
}

async function runBrowserBenchmarks(): Promise<{ results: ScenarioResult[]; browser: string }> {
  execSync("npm run build:browser -w @edge/example-chart-perf-harness", {
    cwd: repoRoot,
    stdio: "inherit",
  });

  const server = spawn(
    "npx",
    ["vite", "preview", "--host", "127.0.0.1", "--port", String(previewPort)],
    {
      cwd: exampleDir,
      stdio: "pipe",
    },
  );

  await waitForServer(`http://127.0.0.1:${previewPort}/`);

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(600_000);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(previewUrl, { waitUntil: "networkidle", timeout: 120_000 });
    await page.waitForFunction(() => window.__EDGE_CHART_PERF_READY__ === true, {
      timeout: 300_000,
    });

    const error = await page.evaluate(() => window.__EDGE_CHART_PERF_ERROR__);
    if (error) throw new Error(String(error));

    const results = await page.evaluate(() => window.__EDGE_CHART_PERF_RESULTS__ ?? []);
    const userAgent = await page.evaluate(() => navigator.userAgent);
    return { results, browser: userAgent };
  } finally {
    await browser.close();
    stopServer(server);
  }
}

function printSummary(baseline: PerfBaseline): void {
  console.log("\nScenario summary:");
  for (const scenario of baseline.scenarios) {
    const parts = [`${scenario.scenario}`, `${scenario.metrics.durationMs}ms`];
    if (scenario.tag) parts.push(`tag=${scenario.tag}`);
    if (scenario.metrics.p50FrameMs != null) {
      parts.push(`p50=${scenario.metrics.p50FrameMs}ms`);
    }
    if (scenario.metrics.p95FrameMs != null) {
      parts.push(`p95=${scenario.metrics.p95FrameMs}ms`);
    }
    if (scenario.metrics.droppedFramePercent != null) {
      parts.push(`dropped=${scenario.metrics.droppedFramePercent}%`);
    }
    console.log(`- [${scenario.layer}] ${parts.join(" | ")}`);
  }
}

function printInteractionSummary(scenarios: ScenarioResult[]): void {
  const interaction = scenarios.filter(
    (scenario) => scenario.tag != null || INTERACTION_SCENARIO_IDS.has(scenario.scenario),
  );

  console.log("\nRuntime interaction summary:");
  for (const scenario of interaction) {
    const parts = [scenario.scenario];
    if (scenario.tag) parts.push(`tag=${scenario.tag}`);
    if (scenario.metrics.p50FrameMs != null) parts.push(`p50=${scenario.metrics.p50FrameMs}ms`);
    if (scenario.metrics.p95FrameMs != null) parts.push(`p95=${scenario.metrics.p95FrameMs}ms`);
    else parts.push(`duration=${scenario.metrics.durationMs}ms`);
    console.log(`- ${parts.join(" | ")}`);
  }
}

function selectInteractionScenarios(scenarios: ScenarioResult[]): ScenarioResult[] {
  return scenarios.filter(
    (scenario) => scenario.tag != null || INTERACTION_SCENARIO_IDS.has(scenario.scenario),
  );
}

function writeBaseline(baseName: string, baseline: PerfBaseline): { latest: string; stamped: string } {
  const latestPath = path.join(perfDir, `${baseName}-latest.json`);
  const stampedPath = path.join(
    perfDir,
    `${baseName}-${baseline.generatedAt.replace(/[:.]/g, "-")}.json`,
  );
  const payload = `${JSON.stringify(baseline, null, 2)}\n`;
  writeFileSync(latestPath, payload);
  writeFileSync(stampedPath, payload);
  return { latest: latestPath, stamped: stampedPath };
}

function loadReferenceBaseline(): ChartPerfBaseline | null {
  const referencePath =
    process.env.CHART_PERF_BUDGET_REFERENCE?.trim() ||
    path.join(perfDir, "runtime-interaction-baseline-latest.json");
  if (!existsSync(referencePath)) return null;
  try {
    return JSON.parse(readFileSync(referencePath, "utf8")) as ChartPerfBaseline;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  console.log("Edge chart performance baseline\n");

  const referenceBaseline = loadReferenceBaseline();
  const budgetConfig = readChartPerfBudgetConfig();

  const microResults = runMicrobenchmarks();
  console.log(`Micro scenarios complete: ${microResults.length}`);

  const { results: browserResults, browser } = await runBrowserBenchmarks();
  console.log(`Browser scenarios complete: ${browserResults.length}`);

  const generatedAt = new Date().toISOString();
  const environment = {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    browser,
  };
  const git = gitMeta();

  const allScenarios = [...microResults, ...browserResults];
  const baseline: PerfBaseline = {
    generatedAt,
    git,
    environment,
    scenarios: allScenarios,
  };

  const interactionScenarios = selectInteractionScenarios(allScenarios);
  const interactionBaseline: PerfBaseline = {
    generatedAt,
    git,
    environment,
    scenarios: interactionScenarios,
  };

  mkdirSync(perfDir, { recursive: true });
  const chartPaths = writeBaseline("chart-baseline", baseline);
  const interactionPaths = writeBaseline("runtime-interaction-baseline", interactionBaseline);

  printSummary(baseline);
  printInteractionSummary(interactionScenarios);
  console.log(
    `\nSaved baselines:\n- ${chartPaths.latest}\n- ${chartPaths.stamped}\n- ${interactionPaths.latest}\n- ${interactionPaths.stamped}`,
  );

  if (referenceBaseline) {
    const { breaches, exitCode } = applyChartPerfBudgetGate(
      referenceBaseline,
      interactionBaseline,
      budgetConfig,
    );
    if (breaches.length === 0) {
      console.log("\nChart perf budgets: pass (resident-typical within regression factor)");
    } else if (!budgetConfig.strict) {
      console.log(`\nChart perf budgets: ${breaches.length} warning(s) (non-strict)`);
    } else {
      console.error(`\nChart perf budgets: ${breaches.length} breach(es)`);
      process.exit(exitCode);
    }
  } else {
    console.log("\nChart perf budgets: skipped (no reference baseline on disk)");
  }
}

main().catch((error) => {
  console.error("CHART_PERF: FAIL", error);
  process.exit(1);
});
