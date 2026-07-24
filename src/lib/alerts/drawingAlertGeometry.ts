import type { SerializedDrawing } from "@edge/chart-core/contracts";
import type {
  AlertDefinitionResponse,
  AlertDrawingKind,
  AlertOperator,
} from "@/lib/persistence/schemas/alerts";
import { ALERT_DRAWING_KINDS } from "@/lib/persistence/schemas/alerts";

export type AlertGeometryPatch = {
  price: number;
  priceHigh?: number | null;
  tlT0?: number | null;
  tlV0?: number | null;
  tlT1?: number | null;
  tlV1?: number | null;
  tlExtendLeft?: boolean | null;
  tlExtendRight?: boolean | null;
};

export function isAlertableDrawingKind(name: string): name is AlertDrawingKind {
  return (ALERT_DRAWING_KINDS as readonly string[]).includes(name);
}

export function drawingKindLabel(kind: AlertDrawingKind): string {
  switch (kind) {
    case "horizontal_line":
      return "Horizontal line";
    case "trend_line":
      return "Trend line";
    case "rectangle":
      return "Rectangle";
    default:
      return kind;
  }
}

function pointValue(drawing: SerializedDrawing, index: number): number | null {
  const value = drawing.points[index]?.value;
  return value != null && Number.isFinite(value) ? value : null;
}

function pointTimestamp(drawing: SerializedDrawing, index: number): number | null {
  const timestamp = drawing.points[index]?.timestamp;
  return timestamp != null && Number.isFinite(timestamp) ? timestamp : null;
}

export function interpolateTrendlineLevel(input: {
  t0: number;
  v0: number;
  t1: number;
  v1: number;
  atMs: number;
  extendLeft?: boolean | null;
  extendRight?: boolean | null;
}): number | null {
  const { t0, v0, t1, v1, atMs, extendLeft, extendRight } = input;
  if (!Number.isFinite(t0) || !Number.isFinite(v0) || !Number.isFinite(t1) || !Number.isFinite(v1)) {
    return null;
  }
  if (t0 === t1) return v0;

  const minT = Math.min(t0, t1);
  const maxT = Math.max(t0, t1);
  let t = atMs;
  if (t < minT && !extendLeft) t = minT;
  if (t > maxT && !extendRight) t = maxT;

  return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0);
}

export function resolveGeometryFromDrawing(drawing: SerializedDrawing): AlertGeometryPatch | null {
  if (!isAlertableDrawingKind(drawing.name)) return null;

  switch (drawing.name) {
    case "horizontal_line": {
      const price = pointValue(drawing, 0);
      if (price == null) return null;
      return { price };
    }
    case "trend_line": {
      const t0 = pointTimestamp(drawing, 0);
      const v0 = pointValue(drawing, 0);
      const t1 = pointTimestamp(drawing, 1);
      const v1 = pointValue(drawing, 1);
      if (t0 == null || v0 == null || t1 == null || v1 == null) return null;
      const atMs = Date.now();
      const price = interpolateTrendlineLevel({
        t0,
        v0,
        t1,
        v1,
        atMs,
        extendLeft: drawing.styles?.extendLeft,
        extendRight: drawing.styles?.extendRight,
      });
      if (price == null) return null;
      return {
        price,
        tlT0: t0,
        tlV0: v0,
        tlT1: t1,
        tlV1: v1,
        tlExtendLeft: drawing.styles?.extendLeft ?? false,
        tlExtendRight: drawing.styles?.extendRight ?? false,
      };
    }
    case "rectangle": {
      const v0 = pointValue(drawing, 0);
      const v1 = pointValue(drawing, 1);
      if (v0 == null || v1 == null) return null;
      return { price: Math.min(v0, v1), priceHigh: Math.max(v0, v1) };
    }
    default:
      return null;
  }
}

export function defaultOperatorForDrawing(
  kind: AlertDrawingKind,
  quotePrice: number | null,
  geometry: AlertGeometryPatch,
): AlertOperator {
  if (kind === "rectangle") return "enter_zone";

  const level =
    kind === "trend_line"
      ? geometry.price
      : geometry.price;

  if (quotePrice != null && Number.isFinite(quotePrice)) {
    return quotePrice >= level ? "cross_below" : "cross_above";
  }
  return "cross_above";
}

export function buildAlertPrefillFromDrawing(input: {
  symbol: string;
  drawing: SerializedDrawing;
  quotePrice?: number | null;
}): {
  symbol: string;
  operator: AlertOperator;
  price: number;
  priceHigh?: number;
  drawingId: string;
  drawingKind: AlertDrawingKind;
  tlT0?: number;
  tlV0?: number;
  tlT1?: number;
  tlV1?: number;
  tlExtendLeft?: boolean;
  tlExtendRight?: boolean;
} | null {
  const drawingId = input.drawing.id;
  if (!drawingId || !isAlertableDrawingKind(input.drawing.name)) return null;

  const geometry = resolveGeometryFromDrawing(input.drawing);
  if (!geometry) return null;

  return {
    symbol: input.symbol.trim().toUpperCase(),
    operator: defaultOperatorForDrawing(
      input.drawing.name,
      input.quotePrice ?? null,
      geometry,
    ),
    price: geometry.price,
    priceHigh: geometry.priceHigh ?? undefined,
    drawingId,
    drawingKind: input.drawing.name,
    tlT0: geometry.tlT0 ?? undefined,
    tlV0: geometry.tlV0 ?? undefined,
    tlT1: geometry.tlT1 ?? undefined,
    tlV1: geometry.tlV1 ?? undefined,
    tlExtendLeft: geometry.tlExtendLeft ?? undefined,
    tlExtendRight: geometry.tlExtendRight ?? undefined,
  };
}

export function geometryPatchFromAlert(alert: AlertDefinitionResponse): AlertGeometryPatch {
  return {
    price: alert.price,
    priceHigh: alert.priceHigh ?? null,
    tlT0: alert.tlT0 ?? null,
    tlV0: alert.tlV0 ?? null,
    tlT1: alert.tlT1 ?? null,
    tlV1: alert.tlV1 ?? null,
    tlExtendLeft: alert.tlExtendLeft ?? null,
    tlExtendRight: alert.tlExtendRight ?? null,
  };
}

export function resolveAlertEvaluationTarget(
  alert: AlertDefinitionResponse,
  nowMs: number = Date.now(),
): { targetPrice: number; zoneHigh?: number } | null {
  if (
    alert.drawingKind === "trend_line" &&
    alert.tlT0 != null &&
    alert.tlV0 != null &&
    alert.tlT1 != null &&
    alert.tlV1 != null
  ) {
    const level = interpolateTrendlineLevel({
      t0: alert.tlT0,
      v0: alert.tlV0,
      t1: alert.tlT1,
      v1: alert.tlV1,
      atMs: nowMs,
      extendLeft: alert.tlExtendLeft,
      extendRight: alert.tlExtendRight,
    });
    if (level == null) return null;
    return { targetPrice: level };
  }

  if (alert.drawingKind === "rectangle" && alert.priceHigh != null) {
    return { targetPrice: alert.price, zoneHigh: alert.priceHigh };
  }

  return { targetPrice: alert.price };
}

export function isInsideZone(price: number, low: number, high: number): boolean {
  const min = Math.min(low, high);
  const max = Math.max(low, high);
  return price >= min && price <= max;
}

export function geometryFingerprint(drawing: SerializedDrawing): string {
  return JSON.stringify({
    name: drawing.name,
    points: drawing.points,
    extendLeft: drawing.styles?.extendLeft ?? false,
    extendRight: drawing.styles?.extendRight ?? false,
  });
}

export function alertGeometryPatchFromDrawing(drawing: SerializedDrawing): Partial<
  AlertDefinitionResponse
> | null {
  const geometry = resolveGeometryFromDrawing(drawing);
  if (!geometry || !drawing.id || !isAlertableDrawingKind(drawing.name)) return null;
  return {
    drawingId: drawing.id,
    drawingKind: drawing.name,
    price: geometry.price,
    priceHigh: geometry.priceHigh ?? null,
    tlT0: geometry.tlT0 ?? null,
    tlV0: geometry.tlV0 ?? null,
    tlT1: geometry.tlT1 ?? null,
    tlV1: geometry.tlV1 ?? null,
    tlExtendLeft: geometry.tlExtendLeft ?? null,
    tlExtendRight: geometry.tlExtendRight ?? null,
  };
}
