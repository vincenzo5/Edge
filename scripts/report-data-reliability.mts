#!/usr/bin/env npx tsx

import {
  OperationalMetricsWindow,
  type OperationalReliabilityReport,
} from "../src/lib/marketData/state/operationalMetrics.ts";

type HealthResponse = {
  ok: boolean;
  health?: {
    operationalReliability?: OperationalReliabilityReport;
  };
  error?: string;
};

const args = new Set(process.argv.slice(2));
const urlArgIndex = process.argv.indexOf("--url");
const url =
  urlArgIndex >= 0 && process.argv[urlArgIndex + 1]
    ? process.argv[urlArgIndex + 1]
    : "http://localhost:3003/api/market-data/health";

function fixtureReport(): OperationalReliabilityReport {
  const metrics = new OperationalMetricsWindow();
  metrics.record({
    kind: "delivery",
    at: 1_000,
    datasetId: "chart_candles",
    success: true,
    fresh: true,
    fallback: false,
    partial: false,
  });
  metrics.record({
    kind: "delivery",
    at: 2_000,
    datasetId: "watchlist_quotes",
    success: true,
    fresh: true,
    fallback: true,
    partial: true,
  });
  metrics.record({
    kind: "delivery",
    at: 5_000,
    datasetId: "watchlist_quotes",
    success: true,
    fresh: true,
    fallback: false,
    partial: false,
  });
  metrics.record({
    kind: "delivery",
    at: 6_000,
    datasetId: "options_chain",
    success: false,
    fresh: false,
    fallback: false,
    partial: false,
  });
  metrics.record({
    kind: "recovery",
    at: 7_000,
    durationMs: 850,
    success: true,
  });
  return metrics.report(8_000);
}

async function fetchReport(): Promise<OperationalReliabilityReport> {
  const headers = process.env.EDGE_API_KEY
    ? { "X-Edge-API-Key": process.env.EDGE_API_KEY }
    : undefined;
  const response = await fetch(url, { headers });
  const body = (await response.json()) as HealthResponse;
  if (!response.ok || !body.ok || !body.health?.operationalReliability) {
    throw new Error(body.error ?? `Reliability report unavailable (${response.status})`);
  }
  return body.health.operationalReliability;
}

function percent(value: number | null): string {
  return value == null ? "no_samples" : `${(value * 100).toFixed(1)}%`;
}

function duration(value: number | null): string {
  return value == null ? "no_samples" : `${value}ms`;
}

function printText(report: OperationalReliabilityReport): void {
  console.log("Edge data reliability report");
  console.log(
    `window=${report.window.durationMs}ms retained=${report.window.retainedSamples}/${report.window.maxSamples}`,
  );
  console.log(
    `delivery_success=${percent(report.deliverySuccess.ratio)} samples=${report.deliverySuccess.samples}`,
  );
  console.log(
    `freshness_compliance=${percent(report.freshnessCompliance.ratio)} samples=${report.freshnessCompliance.samples}`,
  );
  console.log(
    `partial_coverage=${percent(report.partialCoverage.ratio)} samples=${report.partialCoverage.samples}`,
  );
  console.log(
    `fallback_duration_p95=${duration(report.fallbackDuration.p95Ms)} episodes=${report.fallbackDuration.samples} active=${report.fallbackDuration.active}`,
  );
  console.log(
    `recovery_time_p95=${duration(report.recoveryTime.p95Ms)} samples=${report.recoveryTime.samples}`,
  );
}

async function main(): Promise<void> {
  const report = args.has("--fixture") ? fixtureReport() : await fetchReport();
  if (args.has("--json")) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  printText(report);
}

main().catch((error) => {
  console.error(
    "DATA_RELIABILITY_REPORT: FAIL",
    error instanceof Error ? error.message : "Unknown error",
  );
  process.exit(1);
});
