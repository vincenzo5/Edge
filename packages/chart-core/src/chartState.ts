import type { IndicatorConfig, SerializedDrawing } from './contracts';
import type { ChartType } from './series';

/** Public serializable chart state — no app layout or account metadata. */
export type SerializedChartState = {
  version: 1;
  chartType: ChartType;
  indicators: IndicatorConfig[];
  drawings: SerializedDrawing[];
  paneOrder?: string[];
  collapsedPanes?: string[];
  maximizedPane?: string | null;
  paneHeights?: Record<string, number>;
  chartSettings?: Record<string, unknown>;
  /** When false, main candle series is hidden on the price pane. Default visible. */
  mainSeriesVisible?: boolean;
};

export const CHART_STATE_VERSION = 1 as const;

export type ChartStateValidationResult =
  | { ok: true; state: SerializedChartState }
  | { ok: false; errors: string[] };

const CHART_TYPES = new Set<ChartType>([
  'candle_solid',
  'candle_stroke',
  'ohlc',
  'area',
  'heikin_ashi',
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIndicatorConfig(value: unknown): value is IndicatorConfig {
  if (!isObject(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    (value.pane === 'main' || value.pane === 'sub')
  );
}

function isSerializedDrawing(value: unknown): value is SerializedDrawing {
  if (!isObject(value)) return false;
  return (
    typeof value.name === 'string' &&
    typeof value.label === 'string' &&
    Array.isArray(value.points) &&
    typeof value.visible === 'boolean' &&
    typeof value.locked === 'boolean' &&
    typeof value.zLevel === 'number'
  );
}

/** Build a fresh public chart state with defaults. */
export function createDefaultChartState(
  overrides: Partial<Omit<SerializedChartState, 'version'>> = {},
): SerializedChartState {
  return {
    version: CHART_STATE_VERSION,
    chartType: overrides.chartType ?? 'candle_solid',
    indicators: overrides.indicators ?? [],
    drawings: overrides.drawings ?? [],
    paneOrder: overrides.paneOrder,
    collapsedPanes: overrides.collapsedPanes,
    maximizedPane: overrides.maximizedPane ?? null,
    paneHeights: overrides.paneHeights,
    chartSettings: overrides.chartSettings,
    mainSeriesVisible: overrides.mainSeriesVisible,
  };
}

/** Serialize current chart inputs into the public schema. */
export function serializeChartState(input: Omit<SerializedChartState, 'version'>): SerializedChartState {
  return {
    version: CHART_STATE_VERSION,
    chartType: input.chartType,
    indicators: structuredClone(input.indicators),
    drawings: structuredClone(input.drawings),
    paneOrder: input.paneOrder ? [...input.paneOrder] : undefined,
    collapsedPanes: input.collapsedPanes ? [...input.collapsedPanes] : undefined,
    maximizedPane: input.maximizedPane ?? null,
    paneHeights: input.paneHeights ? { ...input.paneHeights } : undefined,
    chartSettings: input.chartSettings ? structuredClone(input.chartSettings) : undefined,
    mainSeriesVisible: input.mainSeriesVisible,
  };
}

/** Migrate legacy or partial payloads to the current schema. */
export function migrateChartState(raw: unknown): SerializedChartState {
  if (!isObject(raw)) {
    return createDefaultChartState();
  }

  const chartType = CHART_TYPES.has(raw.chartType as ChartType)
    ? (raw.chartType as ChartType)
    : 'candle_solid';

  const indicators = Array.isArray(raw.indicators)
    ? raw.indicators.filter(isIndicatorConfig)
    : [];

  const drawings = Array.isArray(raw.drawings)
    ? raw.drawings.filter(isSerializedDrawing)
    : [];

  return {
    version: CHART_STATE_VERSION,
    chartType,
    indicators,
    drawings,
    paneOrder: Array.isArray(raw.paneOrder)
      ? raw.paneOrder.filter((k): k is string => typeof k === 'string')
      : undefined,
    collapsedPanes: Array.isArray(raw.collapsedPanes)
      ? raw.collapsedPanes.filter((k): k is string => typeof k === 'string')
      : undefined,
    maximizedPane:
      typeof raw.maximizedPane === 'string' || raw.maximizedPane === null
        ? raw.maximizedPane
        : null,
    paneHeights: isObject(raw.paneHeights)
      ? (Object.fromEntries(
          Object.entries(raw.paneHeights).filter(
            (entry): entry is [string, number] => typeof entry[1] === 'number',
          ),
        ) as Record<string, number>)
      : undefined,
    chartSettings: isObject(raw.chartSettings) ? { ...raw.chartSettings } : undefined,
    mainSeriesVisible:
      typeof raw.mainSeriesVisible === 'boolean' ? raw.mainSeriesVisible : undefined,
  };
}

/** Validate a public chart state payload. */
export function validateChartState(raw: unknown): ChartStateValidationResult {
  const errors: string[] = [];

  if (!isObject(raw)) {
    return { ok: false, errors: ['State must be an object'] };
  }

  if (raw.version !== CHART_STATE_VERSION) {
    errors.push(`Unsupported version: ${String(raw.version)}`);
  }

  if (!CHART_TYPES.has(raw.chartType as ChartType)) {
    errors.push(`Invalid chartType: ${String(raw.chartType)}`);
  }

  if (!Array.isArray(raw.indicators)) {
    errors.push('indicators must be an array');
  } else if (!raw.indicators.every(isIndicatorConfig)) {
    errors.push('indicators contains invalid entries');
  }

  if (!Array.isArray(raw.drawings)) {
    errors.push('drawings must be an array');
  } else if (!raw.drawings.every(isSerializedDrawing)) {
    errors.push('drawings contains invalid entries');
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, state: migrateChartState(raw) };
}

/** Restore validated state (identity after migrate + validate). */
export function restoreChartState(raw: unknown): SerializedChartState {
  const migrated = migrateChartState(raw);
  const result = validateChartState(migrated);
  if (!result.ok) {
    throw new Error(`Invalid chart state: ${result.errors.join('; ')}`);
  }
  return result.state;
}
