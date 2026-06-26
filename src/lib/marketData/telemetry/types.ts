import type { MarketDataPerfLayer, MarketDataPerfPhase } from "./perfPhases";

export type DataCacheTier = "hot-fresh" | "hot-stale" | "cold";

export type MarketDataTelemetryEventDetail = {
  traceId?: string;
  scenario?: string;
  layer?: MarketDataPerfLayer;
  ok?: boolean;
  provider?: string;
  cacheTier?: DataCacheTier;
  durationMs?: number;
  clientMs?: number;
  serverMs?: number;
  ms?: number;
  serverPhases?: MarketDataPerfPhase[];
  counts?: {
    symbols?: number;
    candles?: number;
    quotes?: number;
    contracts?: number;
    bars?: number;
  };
  symbol?: string;
  interval?: string;
  range?: string;
  source?: string;
  transport?: string;
  error?: string;
  barCount?: number;
  count?: number;
  phases?: number;
  serverTotalMs?: number;
  [key: string]: unknown;
};

export type MarketDataTelemetryEvent = {
  id: string;
  at: number;
  sinceSessionMs: number;
  kind: string;
  detail?: MarketDataTelemetryEventDetail;
};

export type WarmupPhaseReport = {
  name: string;
  ms: number;
  ok: boolean;
  key?: string;
  source?: string;
  cacheTier?: DataCacheTier;
  error?: string;
};

export type WarmupReport = {
  startedAt: number;
  totalMs: number;
  phases: WarmupPhaseReport[];
  traceId?: string;
  apiPhases?: MarketDataPerfPhase[];
};

export type MarketDataTelemetryKindStats = {
  count: number;
  lastMs?: number;
  p50Ms?: number;
};

export type MarketDataTelemetryTraceSummary = {
  traceId: string;
  scenario?: string;
  eventCount: number;
  startedAt: number;
  lastAt: number;
  totalClientMs?: number;
  totalServerMs?: number;
  slowestKind?: string;
  slowestMs?: number;
  cacheTier?: DataCacheTier;
  provider?: string;
};

export type MarketDataTelemetrySnapshot = {
  sessionStartedAt: number;
  events: MarketDataTelemetryEvent[];
  summary: Record<string, MarketDataTelemetryKindStats>;
  traces: MarketDataTelemetryTraceSummary[];
  slowestEvents: MarketDataTelemetryEvent[];
  byProvider: Record<string, MarketDataTelemetryKindStats>;
  byCacheTier: Record<string, MarketDataTelemetryKindStats>;
};

export type MarketDataPerfScenarioResult = {
  scenario: string;
  traceId?: string;
  ok: boolean;
  totalMs: number;
  clientMs?: number;
  serverMs?: number;
  source?: string;
  cacheTier?: DataCacheTier;
  provider?: string;
  counts?: MarketDataTelemetryEventDetail["counts"];
  phases?: MarketDataPerfPhase[];
  error?: string;
};

export type MarketDataPerfBaseline = {
  generatedAt: string;
  git?: {
    commit?: string;
    branch?: string;
  };
  environment: {
    node: string;
    platform: string;
    arch: string;
    twsEnabled: boolean;
    ibkrEnabled: boolean;
    twsGatewayConnected?: boolean;
    ibkrAuthenticated?: boolean;
  };
  scenarios: MarketDataPerfScenarioResult[];
};
