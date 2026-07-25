import {
  clearComputeCache,
  computeCacheKey,
  getComputedSeries,
} from "@edge/chart-core/indicatorCompute";
import {
  advanceCandleSeriesIdentity,
  createCandleSeriesIdentity,
} from "@edge/chart-core";
import { resolveIndicatorInputs } from "@edge/chart-core/indicatorInputs";
import { getAllIndicators } from "@edge/chart-core/indicators/registry";
import type { Candle } from "@edge/chart-core";
import { generateCandles } from "./generateCandles.js";
import { measureDuration } from "./metrics.js";
import { MICRO_CANDLE_COUNTS } from "./scenarios.js";
import type { ScenarioResult } from "./types.js";

function implementedIndicators() {
  return getAllIndicators().filter((plugin) => typeof plugin.compute === "function");
}

function mutateTip(candles: Candle[]): Candle[] {
  const next = candles.slice();
  const lastIndex = next.length - 1;
  const last = next[lastIndex];
  if (!last) return next;

  next[lastIndex] = {
    ...last,
    c: round(last.c + 0.12),
    h: round(Math.max(last.h, last.c + 0.2)),
    l: round(Math.min(last.l, last.c - 0.1)),
    v: (last.v ?? 0) + 2_500,
  };

  return next;
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
    tag: "stress",
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
    tag: "stress",
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

  const identity100k = createCandleSeriesIdentity(candles100k);
  const cacheKeyDurationMs = measureDuration(() => {
    for (const plugin of indicators) {
      const inputs = resolveIndicatorInputs(plugin, { inputs: plugin.defaultInputs });
      computeCacheKey(plugin.name, inputs, candles100k, identity100k);
    }
  });

  results.push({
    scenario: "indicator-cache-key-100k-core-six",
    layer: "micro",
    tag: "stress",
    candleCount: 100_000,
    indicatorCount: indicators.length,
    drawingCount: 0,
    paneCount: 1,
    metrics: {
      durationMs: cacheKeyDurationMs,
      iterations: indicators.length,
    },
    notes: "Revision-based cache-key cost before compute short-circuit.",
  });

  const candles5k = generateCandles(5_000);
  let identity5k = createCandleSeriesIdentity(candles5k);
  clearComputeCache();
  for (const plugin of indicators) {
    const inputs = resolveIndicatorInputs(plugin, { inputs: plugin.defaultInputs });
    getComputedSeries(plugin, candles5k, inputs, undefined, { identity: identity5k });
  }

  const tipCandles = mutateTip(candles5k);
  identity5k = advanceCandleSeriesIdentity(identity5k, tipCandles, "replace-latest");
  const tipTickDurationMs = measureDuration(() => {
    for (const plugin of indicators) {
      const inputs = resolveIndicatorInputs(plugin, { inputs: plugin.defaultInputs });
      getComputedSeries(plugin, tipCandles, inputs, undefined, { identity: identity5k });
    }
  });

  results.push({
    scenario: "indicators-compute-tip-tick-5k-core-six",
    layer: "micro",
    tag: "resident-typical",
    candleCount: 5_000,
    indicatorCount: indicators.length,
    drawingCount: 0,
    paneCount: 1 + indicators.filter((plugin) => plugin.pane === "sub").length,
    metrics: {
      durationMs: tipTickDurationMs,
      iterations: indicators.length,
    },
    notes: "Tip mutation after warm cache — incremental tip path when supported.",
  });

  return results;
}

function formatCount(count: number): string {
  if (count >= 1_000_000) return `${count / 1_000_000}m`;
  if (count >= 1_000) return `${count / 1_000}k`;
  return String(count);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
