import {
  clearComputeCache,
  computeCacheKey,
  getComputedSeries,
} from "../../../packages/chart-core/src/indicatorCompute";
import { resolveIndicatorInputs } from "../../../packages/chart-core/src/indicatorInputs";
import { getAllIndicators } from "../../../packages/chart-core/src/indicators/registry";
import { generateCandles } from "./generateCandles.js";
import { measureDuration } from "./metrics.js";
import { MICRO_CANDLE_COUNTS } from "./scenarios.js";
import type { ScenarioResult } from "./types.js";

function implementedIndicators() {
  return getAllIndicators().filter((plugin) => typeof plugin.compute === "function");
}

export function runMicrobenchmarks(): ScenarioResult[] {
  const results: ScenarioResult[] = [];

  for (const count of MICRO_CANDLE_COUNTS) {
    const durationMs = measureDuration(() => {
      generateCandles(count);
    });

    results.push({
      scenario: `generate-candles-${formatCount(count)}`,
      layer: "micro",
      candleCount: count,
      indicatorCount: 0,
      drawingCount: 0,
      paneCount: 1,
      metrics: { durationMs },
      notes: "Deterministic candle generation only.",
    });
  }

  const candles100k = generateCandles(100_000);
  const indicators = implementedIndicators();

  clearComputeCache();
  const coldDurationMs = measureDuration(() => {
    for (const plugin of indicators) {
      const inputs = resolveIndicatorInputs(plugin, { inputs: plugin.defaultInputs });
      getComputedSeries(plugin, candles100k, inputs);
    }
  });

  results.push({
    scenario: "indicators-compute-cold-100k-core-six",
    layer: "micro",
    candleCount: 100_000,
    indicatorCount: indicators.length,
    drawingCount: 0,
    paneCount: 1 + indicators.filter((plugin) => plugin.pane === "sub").length,
    metrics: {
      durationMs: coldDurationMs,
      iterations: indicators.length,
    },
    notes: "Cold compute cache; all implemented core indicators.",
  });

  const warmDurationMs = measureDuration(() => {
    for (const plugin of indicators) {
      const inputs = resolveIndicatorInputs(plugin, { inputs: plugin.defaultInputs });
      getComputedSeries(plugin, candles100k, inputs);
    }
  });

  results.push({
    scenario: "indicators-compute-warm-100k-core-six",
    layer: "micro",
    candleCount: 100_000,
    indicatorCount: indicators.length,
    drawingCount: 0,
    paneCount: 1 + indicators.filter((plugin) => plugin.pane === "sub").length,
    metrics: {
      durationMs: warmDurationMs,
      iterations: indicators.length,
    },
    notes: "Warm compute cache hit path.",
  });

  const cacheKeyDurationMs = measureDuration(() => {
    for (const plugin of indicators) {
      const inputs = resolveIndicatorInputs(plugin, { inputs: plugin.defaultInputs });
      computeCacheKey(plugin.name, inputs, candles100k);
    }
  });

  results.push({
    scenario: "indicator-cache-key-100k-core-six",
    layer: "micro",
    candleCount: 100_000,
    indicatorCount: indicators.length,
    drawingCount: 0,
    paneCount: 1,
    metrics: {
      durationMs: cacheKeyDurationMs,
      iterations: indicators.length,
    },
    notes: "Cache-key fingerprint cost before compute short-circuit.",
  });

  return results;
}

function formatCount(count: number): string {
  if (count >= 1_000_000) return `${count / 1_000_000}m`;
  if (count >= 1_000) return `${count / 1_000}k`;
  return String(count);
}
