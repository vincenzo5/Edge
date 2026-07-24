import type { IndicatorConfig } from "@edge/chart-core";
import { generateCandles } from "./generateCandles.js";
import type { ScenarioTag } from "./types.js";

export type InteractionKind =
  | "pan-only"
  | "zoom-only"
  | "crosshair-only"
  | "pan-zoom"
  | "tip-tick";

export type BrowserScenario = {
  id: string;
  candleCount: number;
  indicators: IndicatorConfig[];
  drawingCount: number;
  interaction?: InteractionKind;
  tag?: ScenarioTag;
};

const CORE_INDICATORS: IndicatorConfig[] = [
  { id: "perf-ma", name: "MA", pane: "main", inputs: { period: 20 } },
  { id: "perf-ema", name: "EMA", pane: "main", inputs: { period: 20 } },
  { id: "perf-boll", name: "BOLL", pane: "main", inputs: { period: 20, std: 2 } },
  { id: "perf-macd", name: "MACD", pane: "sub", inputs: { fast: 12, slow: 26, signal: 9 } },
  { id: "perf-rsi", name: "RSI", pane: "sub", inputs: { period: 14 } },
  { id: "perf-vol", name: "VOL", pane: "sub" },
];

const RESIDENT_BAR_COUNT = 5_000;
const STRESS_BAR_COUNT = 100_000;

export const BROWSER_SCENARIOS: BrowserScenario[] = [
  {
    id: "initial-render-10k",
    candleCount: 10_000,
    indicators: [],
    drawingCount: 0,
  },
  {
    id: "initial-render-100k",
    candleCount: STRESS_BAR_COUNT,
    indicators: [],
    drawingCount: 0,
    tag: "stress",
  },
  {
    id: "indicators-100k-core-six",
    candleCount: STRESS_BAR_COUNT,
    indicators: CORE_INDICATORS,
    drawingCount: 0,
    tag: "stress",
  },
  {
    id: "interaction-100k-pan-only",
    candleCount: STRESS_BAR_COUNT,
    indicators: CORE_INDICATORS,
    drawingCount: 0,
    interaction: "pan-only",
    tag: "stress",
  },
  {
    id: "interaction-100k-zoom-only",
    candleCount: STRESS_BAR_COUNT,
    indicators: CORE_INDICATORS,
    drawingCount: 0,
    interaction: "zoom-only",
    tag: "stress",
  },
  {
    id: "interaction-100k-crosshair-only",
    candleCount: STRESS_BAR_COUNT,
    indicators: CORE_INDICATORS,
    drawingCount: 0,
    interaction: "crosshair-only",
    tag: "stress",
  },
  {
    id: "interaction-100k-pan-zoom-sample",
    candleCount: STRESS_BAR_COUNT,
    indicators: CORE_INDICATORS,
    drawingCount: 0,
    interaction: "pan-zoom",
    tag: "stress",
  },
  {
    id: "interaction-100k-pan-zoom-drawings-20",
    candleCount: STRESS_BAR_COUNT,
    indicators: CORE_INDICATORS,
    drawingCount: 20,
    interaction: "pan-zoom",
    tag: "stress",
  },
  {
    id: "interaction-5k-crosshair-only",
    candleCount: RESIDENT_BAR_COUNT,
    indicators: CORE_INDICATORS,
    drawingCount: 0,
    interaction: "crosshair-only",
    tag: "resident-typical",
  },
  {
    id: "interaction-5k-pan-zoom",
    candleCount: RESIDENT_BAR_COUNT,
    indicators: CORE_INDICATORS,
    drawingCount: 0,
    interaction: "pan-zoom",
    tag: "resident-typical",
  },
  {
    id: "interaction-5k-pan-zoom-drawings-20",
    candleCount: RESIDENT_BAR_COUNT,
    indicators: CORE_INDICATORS,
    drawingCount: 20,
    interaction: "pan-zoom",
    tag: "resident-typical",
  },
  {
    id: "interaction-5k-tip-tick",
    candleCount: RESIDENT_BAR_COUNT,
    indicators: CORE_INDICATORS,
    drawingCount: 0,
    interaction: "tip-tick",
    tag: "resident-typical",
  },
];

export const MICRO_CANDLE_COUNTS = [10_000, 100_000, 1_000_000] as const;

export function candlesForCount(count: number) {
  return generateCandles(count);
}
