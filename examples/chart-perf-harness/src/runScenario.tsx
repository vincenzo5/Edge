import { createRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createDefaultChartState } from "@edge/chart-core";
import EdgeChart, { type EdgeChartHandle } from "@edge/chart-react";
import { generateCandles } from "./generateCandles.js";
import {
  measureFramesDuring,
  summarizeFrameDurations,
  waitForAnimationFrames,
} from "./metrics.js";
import { BROWSER_SCENARIOS, type BrowserScenario } from "./scenarios.js";
import type { DrawPhaseTimings, ScenarioResult } from "./types.js";

const CHART_WIDTH = 1200;
const CHART_HEIGHT = 640;
const INTERACTION_DURATION_MS = 2000;

async function mountChart(
  host: HTMLElement,
  scenario: BrowserScenario,
): Promise<{ root: Root; handle: EdgeChartHandle | null; durationMs: number }> {
  const candles = generateCandles(scenario.candleCount);
  const handleRef = createRef<EdgeChartHandle>();
  const container = document.createElement("div");
  container.style.width = `${CHART_WIDTH}px`;
  container.style.height = `${CHART_HEIGHT}px`;
  host.appendChild(container);

  const root = createRoot(container);
  const mountStartedAt = performance.now();

  root.render(
    <EdgeChart
      ref={handleRef}
      candles={candles}
      state={createDefaultChartState({
        chartType: "candle_solid",
        indicators: scenario.indicators,
        drawings: [],
      })}
      theme="dark"
      symbol="PERF"
      range="max"
      interval="1d"
      loading={false}
    />,
  );

  await waitForAnimationFrames(4);

  return {
    root,
    handle: handleRef.current,
    durationMs: performance.now() - mountStartedAt,
  };
}

function cleanupMount(root: Root, host: HTMLElement) {
  root.unmount();
  host.replaceChildren();
}

function readDrawPhases(handle: EdgeChartHandle | null): DrawPhaseTimings | undefined {
  const phases = handle?.getLastDrawPhases?.();
  if (!phases) return undefined;
  return {
    backgroundMs: round(phases.backgroundMs),
    gridMs: round(phases.gridMs),
    candlesMs: round(phases.candlesMs),
    indicatorsMs: round(phases.indicatorsMs),
    drawingsMs: round(phases.drawingsMs),
    axesMs: round(phases.axesMs),
    totalMs: round(phases.totalMs),
  };
}

async function runInteraction(
  handle: EdgeChartHandle,
  kind: NonNullable<BrowserScenario["interaction"]>,
): Promise<ReturnType<typeof summarizeFrameDurations>> {
  const frameDurations = await measureFramesDuring(INTERACTION_DURATION_MS, (frameIndex) => {
    const range = handle.getVisibleRange();
    if (!range) return;

    switch (kind) {
      case "pan-only": {
        const shift = (frameIndex % 24) - 12;
        handle.setVisibleRange(range.startIndex + shift, range.endIndex + shift);
        break;
      }
      case "zoom-only": {
        if (frameIndex % 6 === 0) handle.zoomIn();
        break;
      }
      case "crosshair-only": {
        const ts = handle.getLastCandleTimestamp();
        if (ts != null) {
          const offset = (frameIndex % 50) - 25;
          handle.setCrosshairFromSync(ts + offset * 86_400_000);
        }
        break;
      }
      case "pan-zoom": {
        const shift = (frameIndex % 24) - 12;
        handle.setVisibleRange(range.startIndex + shift, range.endIndex + shift);
        if (frameIndex % 18 === 0) handle.zoomIn();
        break;
      }
    }
  });
  return summarizeFrameDurations(frameDurations);
}

function interactionNotes(kind: NonNullable<BrowserScenario["interaction"]>): string {
  switch (kind) {
    case "pan-only":
      return "Initial mount plus 2s pan-only frame sampling.";
    case "zoom-only":
      return "Initial mount plus 2s zoom-only frame sampling.";
    case "crosshair-only":
      return "Initial mount plus 2s crosshair sync frame sampling.";
    case "pan-zoom":
      return "Initial mount plus 2s pan/zoom mixed frame sampling.";
  }
}

async function runBrowserScenario(
  host: HTMLElement,
  scenario: BrowserScenario,
): Promise<ScenarioResult> {
  const { root, handle, durationMs } = await mountChart(host, scenario);

  let interactionMetrics = {};
  if (scenario.interaction && handle) {
    interactionMetrics = await runInteraction(handle, scenario.interaction);
  }

  const drawPhases = readDrawPhases(handle);
  cleanupMount(root, host);

  const subPaneCount = scenario.indicators.filter((indicator) => indicator.pane === "sub").length;

  return {
    scenario: scenario.id,
    layer: "browser",
    candleCount: scenario.candleCount,
    indicatorCount: scenario.indicators.length,
    drawingCount: scenario.drawingCount,
    paneCount: 1 + subPaneCount,
    metrics: {
      durationMs: round(durationMs),
      ...interactionMetrics,
      drawPhases,
    },
    notes: scenario.interaction ? interactionNotes(scenario.interaction) : "Initial mount through four animation frames.",
  };
}

export async function runAllBrowserScenarios(host: HTMLElement): Promise<ScenarioResult[]> {
  const results: ScenarioResult[] = [];

  for (const scenario of BROWSER_SCENARIOS) {
    results.push(await runBrowserScenario(host, scenario));
  }

  return results;
}

export async function runBrowserHarness(): Promise<ScenarioResult[]> {
  const host = document.getElementById("perf-host");
  if (!host) throw new Error("Missing #perf-host container");
  return runAllBrowserScenarios(host);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
