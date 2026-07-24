/**
 * Serializable contracts for user-authored TypeScript indicator scripts.
 * Phase 0: types + validation only — no compiler or VM dependencies here.
 */

import type { Candle, Interval, LineStyleOverride, Range } from './contracts';
import type { MarketSessionMode } from './marketSession';
import type { InputValue, ParamDef, PriceSource } from './plugin-api';
import type { PlotKind } from './legend/types';

/** Frozen language + SDK pairing for migration.
 *
 * Bump policy (Script depth track — see packages/indicator-runtime/ARCHITECTURE.md):
 * - SCRIPT_SDK_VERSION: new TA helpers, plot kinds, or manifest fields scripts depend on.
 * - SCRIPT_LANGUAGE_VERSION: only when syntax/manifest shape breaks saved scripts without migration.
 * - SCRIPT_RUNTIME_ABI: guest VM wire protocol changes only.
 * Additive-only: never rename/remove helpers or plot kinds without migration; stale versions → typed diagnostics.
 */
export const SCRIPT_LANGUAGE_VERSION = 'edge-script-ts-1' as const;
export const SCRIPT_SDK_VERSION = 'edge-indicator-sdk-6' as const;
export const MAX_SCRIPT_ALERT_CONDITIONS = 8;
export const MAX_SCRIPT_ALERT_ID_LENGTH = 32;
export const SCRIPT_RUNTIME_ABI = 'edge-indicator-runtime-1' as const;

export const MAX_SCRIPT_COLOR_RULES = 8;

export type ScriptDiagnosticSeverity = 'error' | 'warning';

export type ScriptDiagnostic = {
  line: number;
  column: number;
  message: string;
  severity: ScriptDiagnosticSeverity;
};

export type ScriptPlotKind =
  | 'line'
  | 'histogram'
  | 'hline'
  | 'band'
  | 'marker'
  | 'bgcolor'
  | 'barcolor';

export type ScriptSeriesStyle = 'line' | 'stepline' | 'circles' | 'crosses' | 'area' | 'columns';

export type ScriptMarkerShape =
  | 'circle'
  | 'cross'
  | 'triangleUp'
  | 'triangleDown'
  | 'arrowUp'
  | 'arrowDown'
  | 'square';

export type ScriptMarkerLocation = 'absolute' | 'aboveBar' | 'belowBar';

export const SCRIPT_MARKER_SHAPES: ScriptMarkerShape[] = [
  'circle',
  'cross',
  'triangleUp',
  'triangleDown',
  'arrowUp',
  'arrowDown',
  'square',
];

export const SCRIPT_MARKER_LOCATIONS: ScriptMarkerLocation[] = [
  'absolute',
  'aboveBar',
  'belowBar',
];

export const SCRIPT_SERIES_STYLES: ScriptSeriesStyle[] = [
  'line',
  'stepline',
  'circles',
  'crosses',
  'area',
  'columns',
];

export const MAX_SCRIPT_MARKERS_PER_SERIES = 2_000;
export const MAX_SCRIPT_BGCOLOR_SEGMENTS = 256;
export const MAX_SCRIPT_BGCOLOR_OPACITY = 0.85;
export const MAX_SCRIPT_OBJECTS = 64;
export const MAX_SCRIPT_LABEL_TEXT_LENGTH = 64;
export const MAX_SCRIPT_OBJECT_ID_LENGTH = 32;
export const SCRIPT_CALCULATE_OBJECTS_KEY = 'objects' as const;

export type ScriptObjectKind = 'box' | 'label' | 'level';

export type ScriptLabelAlign = 'left' | 'center' | 'right';

export const SCRIPT_LABEL_ALIGNS: ScriptLabelAlign[] = ['left', 'center', 'right'];

export type ScriptBoxObjectDef = {
  kind: 'box';
  leftBar: number;
  rightBar: number;
  top: number;
  bottom: number;
  color?: string;
  borderColor?: string;
  borderWidth?: number;
};

export type ScriptLabelObjectDef = {
  kind: 'label';
  bar: number;
  price: number;
  text: string;
  color?: string;
  backgroundColor?: string;
  align?: ScriptLabelAlign;
};

export type ScriptLevelObjectDef = {
  kind: 'level';
  price: number;
  leftBar?: number;
  rightBar?: number;
  color?: string;
  lineWidth?: number;
};

export type ScriptObjectDef = ScriptBoxObjectDef | ScriptLabelObjectDef | ScriptLevelObjectDef;

export type ScriptColorRuleWhen =
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'eq'
  | 'ne'
  | 'positive'
  | 'negative'
  | 'zero'
  | 'null';

export type ScriptColorRule = {
  when: ScriptColorRuleWhen;
  value?: number;
  color: string;
};

export type ScriptPlotDef = {
  kind: ScriptPlotKind;
  title: string;
  /** Literal CSS color only — no function-valued colors. */
  color?: string;
  lineWidth?: number;
  /** Bounded serializable conditional color rules (first match wins). */
  colorRules?: ScriptColorRule[];
  /** For hline plots. */
  hlineAt?: number;
  /** For band plots — lower plot id to fill toward. */
  fillBetween?: string;
  fillColor?: string;
  /** Richer line/histogram rendering style (Phase 2). */
  style?: ScriptSeriesStyle;
  /** Marker shape (marker plots). */
  shape?: ScriptMarkerShape;
  /** Marker anchor (marker plots). */
  location?: ScriptMarkerLocation;
  /** Marker pixel size (marker plots). */
  size?: number;
  /** Background tint opacity 0–1 (bgcolor plots). */
  opacity?: number;
};

export type ScriptInputSchema = Record<string, ParamDef>;

export type ScriptAlertDef = {
  title: string;
  seriesId: string;
};

export type ScriptManifest = {
  name: string;
  pane: 'main' | 'sub';
  inputs: ScriptInputSchema;
  plots: Record<string, ScriptPlotDef>;
  /** Named boolean/series conditions armable via the shared alerts engine (Phase 4). */
  alerts?: Record<string, ScriptAlertDef>;
};

export type ScriptIdentity = {
  scriptId: string;
  revision: string;
  languageVersion: typeof SCRIPT_LANGUAGE_VERSION;
  sdkVersion: typeof SCRIPT_SDK_VERSION;
};

export type ScriptCompileResult = {
  ok: boolean;
  diagnostics: ScriptDiagnostic[];
  artifact?: string;
  artifactHash?: string;
  manifest?: ScriptManifest;
  languageVersion?: typeof SCRIPT_LANGUAGE_VERSION;
  sdkVersion?: typeof SCRIPT_SDK_VERSION;
};

export type ScriptExecutionStatus = 'ready' | 'stale' | 'error';

export type ScriptExecutionFingerprints = {
  revision: string;
  runtimeAbi: typeof SCRIPT_RUNTIME_ABI;
  sdkVersion: typeof SCRIPT_SDK_VERSION;
  inputsFingerprint: string;
  candleFingerprint: string;
  secondarySeriesFingerprint?: string;
  sessionKey: string;
};

export type ScriptSeriesRequest = {
  symbol?: string;
  interval?: Interval;
};

export type ScriptSeriesContext = {
  symbol: string;
  interval: Interval;
  range: Range;
  sessionMode?: MarketSessionMode;
};

export type ScriptSeriesResolver = (
  requests: ScriptSeriesRequest[],
  context: ScriptSeriesContext,
  signal?: AbortSignal,
) => Promise<Map<string, Candle[]>>;

export type ScriptExecutionErrorCode =
  | 'compile'
  | 'runtime'
  | 'timeout'
  | 'memory'
  | 'validation'
  | 'cancelled'
  | 'limit'
  | 'unsupported-version'
  | 'missing-revision'
  | 'invalid-output'
  | 'series-budget'
  | 'series-fetch'
  | 'series-unstable';

export type ScriptExecutionResult = {
  status: ScriptExecutionStatus;
  series: Record<string, Array<number | null>>;
  plots: Record<string, ScriptPlotDef>;
  /** Declarative chart objects (box/label/level) — not user DrawingStore entries. */
  objects?: Record<string, ScriptObjectDef>;
  fingerprints: ScriptExecutionFingerprints;
  error?: string;
  errorCode?: ScriptExecutionErrorCode;
};

export type ScriptIndicatorInstanceRef = {
  kind: 'script';
  scriptId: string;
  revision: string;
};

export type BuiltinIndicatorInstanceRef = {
  kind: 'builtin';
};

export type IndicatorInstanceRef = ScriptIndicatorInstanceRef | BuiltinIndicatorInstanceRef;

/** Additive instance fields — full workspace Zod migration lands in Phase 2. */
export type ScriptIndicatorConfigExtension = {
  kind?: 'script' | 'builtin';
  scriptId?: string;
  revision?: string;
};

export type ScriptRuntimeBudgets = {
  maxSourceBytes: number;
  maxCompileMs: number;
  maxExecuteMs: number;
  maxGuestMemoryBytes: number;
  maxPlotCount: number;
  maxSeriesCount: number;
  maxOutputValues: number;
  maxCandleCount: number;
  maxOutputBytes: number;
  maxMarkersPerSeries: number;
  maxBgcolorSegments: number;
  maxSecondarySeriesRequests: number;
  maxSecondarySeriesBars: number;
  secondaryFetchTimeoutMs: number;
  maxScriptObjects: number;
};

export const DEFAULT_SCRIPT_RUNTIME_BUDGETS: ScriptRuntimeBudgets = {
  maxSourceBytes: 64 * 1024,
  maxCompileMs: 3_000,
  maxExecuteMs: 2_000,
  maxGuestMemoryBytes: 8 * 1024 * 1024,
  maxPlotCount: 16,
  maxSeriesCount: 16,
  maxOutputValues: 500_000,
  maxCandleCount: 20_000,
  maxOutputBytes: 4 * 1024 * 1024,
  maxMarkersPerSeries: MAX_SCRIPT_MARKERS_PER_SERIES,
  maxBgcolorSegments: MAX_SCRIPT_BGCOLOR_SEGMENTS,
  maxSecondarySeriesRequests: 2,
  maxSecondarySeriesBars: 10_000,
  secondaryFetchTimeoutMs: 5_000,
  maxScriptObjects: MAX_SCRIPT_OBJECTS,
};

export type NormalizedScriptCandle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

const COMPARATIVE_COLOR_RULES: ScriptColorRuleWhen[] = ['gt', 'gte', 'lt', 'lte', 'eq', 'ne'];

const ERROR_CODE_LABELS: Record<ScriptExecutionErrorCode, string> = {
  compile: 'Compile error',
  runtime: 'Runtime error',
  timeout: 'Timed out',
  memory: 'Memory limit',
  validation: 'Validation error',
  cancelled: 'Cancelled',
  limit: 'Limit exceeded',
  'unsupported-version': 'Unsupported script version',
  'missing-revision': 'Missing script revision',
  'invalid-output': 'Invalid script output',
  'series-budget': 'Series request limit',
  'series-fetch': 'Series fetch failed',
  'series-unstable': 'Series request mismatch',
};

export function formatScriptError(
  code: ScriptExecutionErrorCode | undefined,
  message?: string,
): string {
  const title = code ? ERROR_CODE_LABELS[code] : 'Script error';
  if (message?.trim()) return `${title}: ${message.trim()}`;
  return title;
}

export function normalizeScriptCandles(candles: Candle[]): NormalizedScriptCandle[] {
  return candles.map((c) => ({
    t: c.t,
    o: c.o,
    h: c.h,
    l: c.l,
    c: c.c,
    v: c.v ?? 0,
  }));
}

export function scriptPlotKindToPlotKind(kind: ScriptPlotKind): PlotKind {
  switch (kind) {
    case 'histogram':
      return 'histogram';
    case 'hline':
      return 'hline';
    case 'marker':
      return 'marker';
    case 'bgcolor':
      return 'bgcolor';
    case 'barcolor':
      return 'barcolor';
    case 'band':
    case 'line':
    default:
      return 'line';
  }
}

export function isScriptVisualPlotKind(kind: ScriptPlotKind): boolean {
  return kind === 'marker' || kind === 'bgcolor' || kind === 'barcolor';
}

export function seriesOutputExcludesFromScale(out: import('./legend/types').SeriesOutput): boolean {
  const plot = out.plot ?? 'line';
  if (plot === 'bgcolor' || plot === 'barcolor') return true;
  if (plot === 'marker' && out.markerLocation !== 'absolute') return true;
  return false;
}

export function isTruthyScriptSignal(value: number | null | undefined): boolean {
  return value != null && Number.isFinite(value) && value !== 0;
}

export function countScriptMarkers(
  values: Array<number | null>,
  startIndex = 0,
  endIndex = values.length,
): number {
  let count = 0;
  const start = Math.max(0, Math.floor(startIndex));
  const end = Math.min(values.length, Math.ceil(endIndex));
  for (let i = start; i < end; i += 1) {
    if (isTruthyScriptSignal(values[i])) count += 1;
  }
  return count;
}

export type ScriptBgcolorSegment = { start: number; end: number; color: string };

export function compactScriptBgcolorSegments(
  values: Array<number | null>,
  resolveColor: (index: number, value: number) => string,
  startIndex = 0,
  endIndex = values.length,
  maxSegments = MAX_SCRIPT_BGCOLOR_SEGMENTS,
): ScriptBgcolorSegment[] {
  const segments: ScriptBgcolorSegment[] = [];
  const start = Math.max(0, Math.floor(startIndex));
  const end = Math.min(values.length, Math.ceil(endIndex));
  let current: ScriptBgcolorSegment | null = null;

  for (let i = start; i < end; i += 1) {
    const value = values[i];
    if (!isTruthyScriptSignal(value)) {
      current = null;
      continue;
    }
    const color = resolveColor(i, value as number);
    if (current && current.color === color && current.end === i) {
      current.end = i + 1;
      continue;
    }
    current = { start: i, end: i + 1, color };
    segments.push(current);
    if (segments.length > maxSegments) {
      return segments.slice(0, maxSegments + 1);
    }
  }

  return segments;
}

export function manifestPlotToSeriesOutput(
  plotId: string,
  plot: ScriptPlotDef,
  seriesKey: string,
): import('./legend/types').SeriesOutput {
  const plotKind = scriptPlotKindToPlotKind(plot.kind);
  return {
    id: plotId,
    label: plot.title,
    key: seriesKey,
    plot: plotKind,
    hlineAt: plot.hlineAt,
    fillBetween: plot.kind === 'band' ? plot.fillBetween : undefined,
    fillColor: plot.fillColor,
    color: plot.color,
    colorRules: plot.colorRules,
    lineWidth: plot.lineWidth,
    style: plot.style,
    markerShape: plot.shape,
    markerLocation: plot.location,
    markerSize: plot.size,
    opacity: plot.opacity,
    excludeFromScale: isScriptVisualPlotKind(plot.kind)
      ? plot.kind !== 'marker' || plot.location !== 'absolute'
      : undefined,
    legendMode:
      plot.kind === 'marker' || plot.kind === 'bgcolor' || plot.kind === 'barcolor'
        ? 'signal'
        : undefined,
  };
}

export function isLiteralScriptColor(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 64;
}

function validateColorRules(rules: unknown): rules is ScriptColorRule[] {
  if (!Array.isArray(rules)) return false;
  if (rules.length > MAX_SCRIPT_COLOR_RULES) return false;
  for (const rule of rules) {
    if (!rule || typeof rule !== 'object') return false;
    const r = rule as ScriptColorRule;
    if (!COMPARATIVE_COLOR_RULES.includes(r.when) && !['positive', 'negative', 'zero', 'null'].includes(r.when)) {
      return false;
    }
    if (COMPARATIVE_COLOR_RULES.includes(r.when) && typeof r.value !== 'number') return false;
    if (!isLiteralScriptColor(r.color)) return false;
  }
  return true;
}

export function matchesScriptColorRule(rule: ScriptColorRule, value: number | null): boolean {
  switch (rule.when) {
    case 'null':
      return value == null || !Number.isFinite(value);
    case 'zero':
      return value != null && Number.isFinite(value) && value === 0;
    case 'positive':
      return value != null && Number.isFinite(value) && value > 0;
    case 'negative':
      return value != null && Number.isFinite(value) && value < 0;
    case 'gt':
      return value != null && Number.isFinite(value) && rule.value != null && value > rule.value;
    case 'gte':
      return value != null && Number.isFinite(value) && rule.value != null && value >= rule.value;
    case 'lt':
      return value != null && Number.isFinite(value) && rule.value != null && value < rule.value;
    case 'lte':
      return value != null && Number.isFinite(value) && rule.value != null && value <= rule.value;
    case 'eq':
      return value != null && Number.isFinite(value) && rule.value != null && value === rule.value;
    case 'ne':
      return value != null && Number.isFinite(value) && rule.value != null && value !== rule.value;
    default:
      return false;
  }
}

export function evaluateScriptColorRules(
  rules: ScriptColorRule[] | undefined,
  value: number | null,
  fallback: string,
): string {
  if (!rules?.length) return fallback;
  for (const rule of rules) {
    if (matchesScriptColorRule(rule, value)) return rule.color;
  }
  return fallback;
}

export function validateParamDef(def: unknown): def is ParamDef {
  if (!def || typeof def !== 'object') return false;
  const d = def as ParamDef;
  if (d.kind === 'number') {
    return typeof d.label === 'string' && typeof d.default === 'number';
  }
  if (d.kind === 'boolean') {
    return typeof d.label === 'string' && typeof d.default === 'boolean';
  }
  if (d.kind === 'enum') {
    return (
      typeof d.label === 'string' &&
      typeof d.default === 'string' &&
      Array.isArray(d.options) &&
      d.options.length > 0 &&
      d.options.every(
        (opt) =>
          opt &&
          typeof opt === 'object' &&
          typeof opt.value === 'string' &&
          typeof opt.label === 'string',
      )
    );
  }
  if (d.kind === 'source') {
    const validSources: PriceSource[] = ['close', 'open', 'high', 'low', 'hlc3', 'ohlcv'];
    return typeof d.label === 'string' && validSources.includes(d.default);
  }
  return false;
}

const VALID_SCRIPT_PLOT_KINDS: ScriptPlotKind[] = [
  'line',
  'histogram',
  'hline',
  'band',
  'marker',
  'bgcolor',
  'barcolor',
];

function validatePlotDef(plot: ScriptPlotDef, pane: 'main' | 'sub'): boolean {
  if (!VALID_SCRIPT_PLOT_KINDS.includes(plot.kind)) return false;
  if (typeof plot.title !== 'string') return false;
  if (plot.color != null && !isLiteralScriptColor(plot.color)) return false;
  if (plot.fillColor != null && !isLiteralScriptColor(plot.fillColor)) return false;
  if (plot.colorRules != null && !validateColorRules(plot.colorRules)) return false;
  if (plot.style != null && !SCRIPT_SERIES_STYLES.includes(plot.style)) return false;
  if (plot.shape != null && !SCRIPT_MARKER_SHAPES.includes(plot.shape)) return false;
  if (plot.location != null && !SCRIPT_MARKER_LOCATIONS.includes(plot.location)) return false;
  if (plot.size != null && (!Number.isFinite(plot.size) || plot.size <= 0 || plot.size > 32)) {
    return false;
  }
  if (
    plot.opacity != null &&
    (!Number.isFinite(plot.opacity) || plot.opacity < 0 || plot.opacity > MAX_SCRIPT_BGCOLOR_OPACITY)
  ) {
    return false;
  }
  if (plot.kind === 'marker') {
    if (!plot.shape || !plot.location) return false;
  }
  if (plot.kind === 'bgcolor') {
    if (!plot.color && !plot.colorRules?.length) return false;
  }
  if (plot.kind === 'barcolor') {
    if (pane !== 'main') return false;
    if (!plot.color && !plot.colorRules?.length) return false;
  }
  if (plot.kind === 'line' && plot.style === 'columns') return false;
  return true;
}

export function validateScriptManifest(manifest: unknown): manifest is ScriptManifest {
  if (!manifest || typeof manifest !== 'object') return false;
  const m = manifest as ScriptManifest;
  if (typeof m.name !== 'string' || !m.name.trim()) return false;
  if (m.pane !== 'main' && m.pane !== 'sub') return false;
  if (!m.inputs || typeof m.inputs !== 'object') return false;
  if (!m.plots || typeof m.plots !== 'object') return false;
  const plotEntries = Object.entries(m.plots);
  if (plotEntries.length === 0) return false;

  for (const [, inputDef] of Object.entries(m.inputs)) {
    if (!validateParamDef(inputDef)) return false;
  }

  for (const [, plot] of plotEntries) {
    if (!plot || typeof plot !== 'object') return false;
    if (!validatePlotDef(plot, m.pane)) return false;
  }

  if (m.alerts != null) {
    if (typeof m.alerts !== 'object') return false;
    const alertEntries = Object.entries(m.alerts);
    if (alertEntries.length > MAX_SCRIPT_ALERT_CONDITIONS) return false;
    for (const [conditionId, def] of alertEntries) {
      if (
        typeof conditionId !== 'string' ||
        conditionId.length === 0 ||
        conditionId.length > MAX_SCRIPT_ALERT_ID_LENGTH
      ) {
        return false;
      }
      if (!def || typeof def !== 'object') return false;
      if (typeof def.title !== 'string' || !def.title.trim()) return false;
      if (typeof def.seriesId !== 'string' || !def.seriesId.trim()) return false;
      if (def.seriesId.length > MAX_SCRIPT_ALERT_ID_LENGTH) return false;
    }
  }

  return true;
}

export function validateScriptAlertSeries(
  manifest: ScriptManifest,
  series: Record<string, Array<number | null>>,
): { ok: true } | { ok: false; error: string } {
  if (!manifest.alerts) return { ok: true };
  for (const [conditionId, def] of Object.entries(manifest.alerts)) {
    if (!series[def.seriesId]) {
      return {
        ok: false,
        error: `alert ${conditionId} references missing series ${def.seriesId}`,
      };
    }
  }
  return { ok: true };
}

export function estimateScriptOutputBytes(series: Record<string, Array<number | null>>): number {
  let bytes = 2;
  const keys = Object.keys(series).sort();
  for (const key of keys) {
    bytes += key.length + 4;
    const values = series[key];
    if (!Array.isArray(values)) continue;
    for (const v of values) {
      bytes += v == null ? 4 : 16;
    }
  }
  return bytes;
}

export function normalizeScriptBoxBounds(box: ScriptBoxObjectDef): {
  top: number;
  bottom: number;
  leftBar: number;
  rightBar: number;
} {
  return {
    top: Math.max(box.top, box.bottom),
    bottom: Math.min(box.top, box.bottom),
    leftBar: Math.min(Math.floor(box.leftBar), Math.floor(box.rightBar)),
    rightBar: Math.max(Math.floor(box.leftBar), Math.floor(box.rightBar)),
  };
}

function isValidBarIndex(value: unknown, candleCount: number): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= 0 &&
    value < candleCount
  );
}

function validateScriptObjectDef(obj: unknown): obj is ScriptObjectDef {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as ScriptObjectDef;
  if (o.kind === 'box') {
    if (!Number.isFinite(o.leftBar) || !Number.isFinite(o.rightBar)) return false;
    if (!Number.isFinite(o.top) || !Number.isFinite(o.bottom)) return false;
    if (o.color != null && !isLiteralScriptColor(o.color)) return false;
    if (o.borderColor != null && !isLiteralScriptColor(o.borderColor)) return false;
    if (o.borderWidth != null && (!Number.isFinite(o.borderWidth) || o.borderWidth <= 0 || o.borderWidth > 8)) {
      return false;
    }
    return true;
  }
  if (o.kind === 'label') {
    if (!Number.isFinite(o.bar) || !Number.isFinite(o.price)) return false;
    if (typeof o.text !== 'string' || o.text.length === 0 || o.text.length > MAX_SCRIPT_LABEL_TEXT_LENGTH) {
      return false;
    }
    if (o.color != null && !isLiteralScriptColor(o.color)) return false;
    if (o.backgroundColor != null && !isLiteralScriptColor(o.backgroundColor)) return false;
    if (o.align != null && !SCRIPT_LABEL_ALIGNS.includes(o.align)) return false;
    return true;
  }
  if (o.kind === 'level') {
    if (!Number.isFinite(o.price)) return false;
    if (o.leftBar != null && !Number.isFinite(o.leftBar)) return false;
    if (o.rightBar != null && !Number.isFinite(o.rightBar)) return false;
    if (o.color != null && !isLiteralScriptColor(o.color)) return false;
    if (o.lineWidth != null && (!Number.isFinite(o.lineWidth) || o.lineWidth <= 0 || o.lineWidth > 8)) {
      return false;
    }
    return true;
  }
  return false;
}

export function peelScriptCalculateOutput(raw: Record<string, unknown>): {
  seriesRaw: Record<string, unknown>;
  objectsRaw?: Record<string, unknown>;
} {
  const { [SCRIPT_CALCULATE_OBJECTS_KEY]: objectsRaw, ...seriesRaw } = raw;
  if (objectsRaw == null) {
    return { seriesRaw };
  }
  if (typeof objectsRaw !== 'object' || Array.isArray(objectsRaw)) {
    return { seriesRaw, objectsRaw: undefined };
  }
  return { seriesRaw, objectsRaw: objectsRaw as Record<string, unknown> };
}

export function validateScriptObjects(
  objects: Record<string, ScriptObjectDef> | undefined,
  candleCount: number,
  budgets: ScriptRuntimeBudgets,
  manifestPane: 'main' | 'sub',
): { ok: true } | { ok: false; error: string; errorCode: ScriptExecutionErrorCode } {
  if (!objects || Object.keys(objects).length === 0) {
    return { ok: true };
  }
  if (manifestPane !== 'main') {
    return {
      ok: false,
      error: 'script objects are only supported on main pane scripts',
      errorCode: 'invalid-output',
    };
  }
  const entries = Object.entries(objects);
  if (entries.length > budgets.maxScriptObjects) {
    return {
      ok: false,
      error: `object count ${entries.length} exceeds limit`,
      errorCode: 'limit',
    };
  }
  for (const [objectId, def] of entries) {
    if (
      typeof objectId !== 'string' ||
      objectId.length === 0 ||
      objectId.length > MAX_SCRIPT_OBJECT_ID_LENGTH
    ) {
      return { ok: false, error: `invalid object id ${objectId}`, errorCode: 'invalid-output' };
    }
    if (!validateScriptObjectDef(def)) {
      return { ok: false, error: `invalid object ${objectId}`, errorCode: 'invalid-output' };
    }
    if (def.kind === 'box') {
      const bounds = normalizeScriptBoxBounds(def);
      if (!isValidBarIndex(bounds.leftBar, candleCount) || !isValidBarIndex(bounds.rightBar, candleCount)) {
        return {
          ok: false,
          error: `box ${objectId} bar indices out of range`,
          errorCode: 'invalid-output',
        };
      }
    }
    if (def.kind === 'label') {
      if (!isValidBarIndex(Math.floor(def.bar), candleCount)) {
        return {
          ok: false,
          error: `label ${objectId} bar index out of range`,
          errorCode: 'invalid-output',
        };
      }
    }
    if (def.kind === 'level') {
      if (def.leftBar != null && !isValidBarIndex(Math.floor(def.leftBar), candleCount)) {
        return {
          ok: false,
          error: `level ${objectId} leftBar out of range`,
          errorCode: 'invalid-output',
        };
      }
      if (def.rightBar != null && !isValidBarIndex(Math.floor(def.rightBar), candleCount)) {
        return {
          ok: false,
          error: `level ${objectId} rightBar out of range`,
          errorCode: 'invalid-output',
        };
      }
      if (def.leftBar != null && def.rightBar != null && Math.floor(def.leftBar) > Math.floor(def.rightBar)) {
        return {
          ok: false,
          error: `level ${objectId} leftBar must be <= rightBar`,
          errorCode: 'invalid-output',
        };
      }
    }
  }
  return { ok: true };
}

export function validateScriptExecutionResult(
  result: ScriptExecutionResult,
  candleCount: number,
  budgets: ScriptRuntimeBudgets = DEFAULT_SCRIPT_RUNTIME_BUDGETS,
  manifestPane: 'main' | 'sub' = 'main',
): { ok: true } | { ok: false; error: string; errorCode: ScriptExecutionErrorCode } {
  const objectValidation = validateScriptObjects(result.objects, candleCount, budgets, manifestPane);
  if (!objectValidation.ok) {
    return objectValidation;
  }

  const plotIds = Object.keys(result.plots);
  const seriesKeys = Object.keys(result.series);
  if (plotIds.length > budgets.maxPlotCount) {
    return { ok: false, error: `plot count ${plotIds.length} exceeds limit`, errorCode: 'limit' };
  }
  if (seriesKeys.length > budgets.maxSeriesCount) {
    return { ok: false, error: `series count ${seriesKeys.length} exceeds limit`, errorCode: 'limit' };
  }

  let valueCount = 0;
  for (const key of seriesKeys) {
    const values = result.series[key];
    if (!Array.isArray(values)) {
      return { ok: false, error: `series ${key} is not an array`, errorCode: 'invalid-output' };
    }
    if (values.length !== candleCount) {
      return {
        ok: false,
        error: `series ${key} length ${values.length} != candle count ${candleCount}`,
        errorCode: 'invalid-output',
      };
    }
    valueCount += values.length;
    for (let i = 0; i < values.length; i += 1) {
      const v = values[i];
      if (v != null && (!Number.isFinite(v) || Number.isNaN(v))) {
        return { ok: false, error: `series ${key}[${i}] is not finite`, errorCode: 'invalid-output' };
      }
    }
  }

  if (valueCount > budgets.maxOutputValues) {
    return { ok: false, error: 'output payload exceeds value count limit', errorCode: 'limit' };
  }

  const outputBytes = estimateScriptOutputBytes(result.series);
  if (outputBytes > budgets.maxOutputBytes) {
    return { ok: false, error: 'output payload exceeds byte size limit', errorCode: 'limit' };
  }

  for (const key of seriesKeys) {
    if (!result.plots[key]) {
      const onlyHlineGuides = seriesKeys.every((k) => result.plots[k]?.kind === 'hline');
      if (!onlyHlineGuides) {
        return {
          ok: false,
          error: `series ${key} has no matching plot declaration`,
          errorCode: 'invalid-output',
        };
      }
    }
  }

  for (const [plotId, plot] of Object.entries(result.plots)) {
    if (plot.kind === 'band' && plot.fillBetween) {
      if (!result.plots[plot.fillBetween]) {
        return {
          ok: false,
          error: `band ${plotId} references missing plot ${plot.fillBetween}`,
          errorCode: 'invalid-output',
        };
      }
      if (!result.series[plot.fillBetween] && !result.series[plotId]) {
        return {
          ok: false,
          error: `band ${plotId} requires series for fill targets`,
          errorCode: 'invalid-output',
        };
      }
    }
    if (plot.kind === 'hline' && plot.hlineAt == null) {
      return { ok: false, error: `hline ${plotId} missing hlineAt`, errorCode: 'invalid-output' };
    }
    if (plot.kind === 'marker' || plot.kind === 'bgcolor' || plot.kind === 'barcolor') {
      const values = result.series[plotId];
      if (!values) {
        return {
          ok: false,
          error: `plot ${plotId} requires a matching data series`,
          errorCode: 'invalid-output',
        };
      }
      if (plot.kind === 'marker') {
        const markerCount = countScriptMarkers(values);
        if (markerCount > budgets.maxMarkersPerSeries) {
          return {
            ok: false,
            error: `marker plot ${plotId} exceeds marker budget (${markerCount})`,
            errorCode: 'limit',
          };
        }
      }
      if (plot.kind === 'bgcolor') {
        const segments = compactScriptBgcolorSegments(
          values,
          (index, value) =>
            evaluateScriptColorRules(plot.colorRules, value, plot.color ?? '#64748b'),
          0,
          values.length,
          budgets.maxBgcolorSegments + 1,
        );
        if (segments.length > budgets.maxBgcolorSegments) {
          return {
            ok: false,
            error: `bgcolor plot ${plotId} exceeds segment budget (${segments.length})`,
            errorCode: 'limit',
          };
        }
      }
      continue;
    }
    if (plot.kind !== 'hline' && plot.kind !== 'band' && !result.series[plotId]) {
      return {
        ok: false,
        error: `plot ${plotId} requires a matching data series`,
        errorCode: 'invalid-output',
      };
    }
  }

  return { ok: true };
}

export function stableScriptInputsFingerprint(inputs: Record<string, InputValue>): string {
  const keys = Object.keys(inputs).sort();
  const parts = keys.map((k) => `${k}:${JSON.stringify(inputs[k])}`);
  return parts.join('|');
}

export type ScriptResolvedInputs = Record<string, InputValue | PriceSource>;
