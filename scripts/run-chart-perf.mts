import { execSync, spawn, type ChildProcess } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { runMicrobenchmarks } from "../examples/chart-perf-harness/src/microbench.ts";
import type { PerfBaseline, ScenarioResult } from "../examples/chart-perf-harness/src/types.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const exampleDir = path.join(repoRoot, "examples/chart-perf-harness");
const perfDir = path.join(repoRoot, "docs/perf");
const previewPort = 5199;
const previewUrl = `http://127.0.0.1:${previewPort}/?autorun=1`;

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
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(previewUrl, { waitUntil: "networkidle", timeout: 120_000 });
    await page.waitForFunction(() => window.__EDGE_CHART_PERF_READY__ === true, {
      timeout: 180_000,
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
    if (scenario.metrics.p95FrameMs != null) {
      parts.push(`p95=${scenario.metrics.p95FrameMs}ms`);
    }
    if (scenario.metrics.droppedFramePercent != null) {
      parts.push(`dropped=${scenario.metrics.droppedFramePercent}%`);
    }
    console.log(`- [${scenario.layer}] ${parts.join(" | ")}`);
  }
}

async function main(): Promise<void> {
  console.log("Edge chart performance baseline\n");

  const microResults = runMicrobenchmarks();
  console.log(`Micro scenarios complete: ${microResults.length}`);

  const { results: browserResults, browser } = await runBrowserBenchmarks();
  console.log(`Browser scenarios complete: ${browserResults.length}`);

  const baseline: PerfBaseline = {
    generatedAt: new Date().toISOString(),
    git: gitMeta(),
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      browser,
    },
    scenarios: [...microResults, ...browserResults],
  };

  mkdirSync(perfDir, { recursive: true });
  const latestPath = path.join(perfDir, "chart-baseline-latest.json");
  const stampedPath = path.join(
    perfDir,
    `chart-baseline-${baseline.generatedAt.replace(/[:.]/g, "-")}.json`,
  );

  const payload = `${JSON.stringify(baseline, null, 2)}\n`;
  writeFileSync(latestPath, payload);
  writeFileSync(stampedPath, payload);

  printSummary(baseline);
  console.log(`\nSaved baseline:\n- ${latestPath}\n- ${stampedPath}`);
}

main().catch((error) => {
  console.error("CHART_PERF: FAIL", error);
  process.exit(1);
});
