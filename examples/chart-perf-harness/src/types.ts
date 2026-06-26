export type DrawPhaseTimings = {
  backgroundMs?: number;
  gridMs?: number;
  candlesMs?: number;
  indicatorsMs?: number;
  drawingsMs?: number;
  axesMs?: number;
  totalMs?: number;
};

export type PerfMetrics = {
  durationMs: number;
  averageFrameMs?: number;
  p50FrameMs?: number;
  p95FrameMs?: number;
  maxFrameMs?: number;
  droppedFramePercent?: number;
  frameSamples?: number;
  iterations?: number;
  drawPhases?: DrawPhaseTimings;
};

export type ScenarioResult = {
  scenario: string;
  layer: "micro" | "browser";
  candleCount: number;
  indicatorCount: number;
  drawingCount: number;
  paneCount: number;
  metrics: PerfMetrics;
  notes?: string;
};

export type PerfBaseline = {
  generatedAt: string;
  git?: {
    commit?: string;
    branch?: string;
  };
  environment: {
    node: string;
    platform: string;
    arch: string;
    browser?: string;
  };
  scenarios: ScenarioResult[];
};

declare global {
  interface Window {
    __EDGE_CHART_PERF_RESULTS__?: ScenarioResult[];
    __EDGE_CHART_PERF_READY__?: boolean;
    __EDGE_CHART_PERF_ERROR__?: string;
  }
}
