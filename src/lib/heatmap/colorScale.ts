import type {
  HeatMapColorConfig,
  HeatMapColorScaleConfig,
  HeatMapPalette,
} from "./types";

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace("#", "").trim();
  if (normalized.length !== 6) return null;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((channel) => Number.isNaN(channel))) return null;
  return { r, g, b };
}

export function rgbaFromHex(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(120, 123, 134, ${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function percentile(values: number[], pct: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor((pct / 100) * (sorted.length - 1))),
  );
  return sorted[index] ?? 0;
}

export function resolveColorDomain(
  values: Array<number | null>,
  scale: HeatMapColorScaleConfig,
): { min: number; mid: number; max: number } {
  const finite = values.filter((value): value is number => value != null && Number.isFinite(value));
  if (scale.domain === "fixed") {
    return {
      min: scale.min ?? -3,
      mid: scale.mid ?? 0,
      max: scale.max ?? 3,
    };
  }
  if (finite.length === 0) {
    return { min: -1, mid: 0, max: 1 };
  }
  if (scale.domain === "percentile") {
    const low = percentile(finite, scale.lowPct ?? 5);
    const high = percentile(finite, scale.highPct ?? 95);
    const mid = scale.mid ?? (scale.kind === "diverging" ? 0 : (low + high) / 2);
    return { min: low, mid, max: high };
  }
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const mid = scale.mid ?? (scale.kind === "diverging" ? 0 : (min + max) / 2);
  return { min, mid, max };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function divergingIntensity(value: number, min: number, mid: number, max: number): {
  tone: "positive" | "negative" | "neutral";
  intensity: number;
} {
  if (!Number.isFinite(value)) {
    return { tone: "neutral", intensity: 0 };
  }
  if (value === mid || (min === max && value === min)) {
    return { tone: "neutral", intensity: 0 };
  }
  if (value > mid) {
    const span = Math.max(max - mid, Number.EPSILON);
    return { tone: "positive", intensity: clamp01((value - mid) / span) };
  }
  const span = Math.max(mid - min, Number.EPSILON);
  return { tone: "negative", intensity: clamp01((mid - value) / span) };
}

function sequentialIntensity(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  const span = Math.max(max - min, Number.EPSILON);
  return clamp01((value - min) / span);
}

export function colorForValue(
  value: number | null,
  config: HeatMapColorConfig,
  domain: { min: number; mid: number; max: number },
  palette: HeatMapPalette,
): string {
  if (value == null || !Number.isFinite(value)) {
    return rgbaFromHex(palette.neutral, 0.35);
  }

  const baseAlpha = 0.12;
  const maxAlpha = 0.55;

  if (config.scale.kind === "diverging") {
    const { tone, intensity } = divergingIntensity(
      value,
      domain.min,
      domain.mid,
      domain.max,
    );
    const alpha = baseAlpha + intensity * (maxAlpha - baseAlpha);
    if (tone === "positive") return rgbaFromHex(palette.positive, alpha);
    if (tone === "negative") return rgbaFromHex(palette.negative, alpha);
    return rgbaFromHex(palette.neutral, 0.25);
  }

  const intensity = sequentialIntensity(value, domain.min, domain.max);
  const alpha = baseAlpha + intensity * (maxAlpha - baseAlpha);
  return rgbaFromHex(palette.positive, alpha);
}

export function formatColorValue(value: number | null, metric: string): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (metric === "changePercent") {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  }
  if (metric === "beta") return value.toFixed(2);
  if (metric === "volume") {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
