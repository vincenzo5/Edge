import type { Candle, SerializedDrawing } from '../contracts';
import type { DrawingPoint, MagnetDragAxis } from '../drawingCoords';
import { timestampForDataIndex } from '../drawingCoords';
import { targetPriceForRMultiple } from '../risk/riskCompute';
import type { RiskDirection } from '../risk/riskTypes';
import { HIT_TOLERANCE_PX } from './primitives';

/** Default box width (bars) when auto-placing a long/short position. */
export const DEFAULT_POSITION_WIDTH_BARS = 10;

/** Floor for default risk as a fraction of entry price (when bar range is tiny). */
export const DEFAULT_POSITION_RISK_PCT = 0.005;

export type PositionRLevel = {
  r: number;
  price: number;
};

/** Max integer R yard lines drawn in the profit zone. */
export const MAX_POSITION_R_LEVELS = 20;

export type PositionBox = {
  entry: number;
  stop: number;
  target: number;
  leftTimestamp: number;
  rightTimestamp: number;
};

const POSITION_TOOL_NAMES = new Set(['long_position', 'short_position']);

export function isPositionDrawingName(name: string): boolean {
  return POSITION_TOOL_NAMES.has(name);
}

/** Opt-in via Settings; default OFF (TradingView parity — entry stays at place). */
export function stickEntryToLastPriceEnabled(drawing: SerializedDrawing): boolean {
  if (!isPositionDrawingName(drawing.name)) return false;
  return drawing.styles?.stickEntryToLastPrice === true;
}

/**
 * Move entry (points 0 + 3) to `price`; leave stop/target unchanged.
 * Returns null when stick is off, price invalid, or entry already matches.
 */
export function applyStickEntryPrice(
  drawing: SerializedDrawing,
  price: number,
): SerializedDrawing | null {
  if (!stickEntryToLastPriceEnabled(drawing)) return null;
  if (!Number.isFinite(price) || drawing.points.length < 4) return null;
  const current = drawing.points[0]?.value;
  if (current != null && Number.isFinite(current) && Math.abs(current - price) < 1e-12) {
    return null;
  }
  const points = drawing.points.map((p, i) =>
    i === 0 || i === 3 ? { ...p, value: price } : { ...p },
  );
  const direction = directionFromPositionName(drawing.name);
  if (!direction) return null;
  return { ...drawing, points: clampPositionPoints(points, direction) };
}

/** Persist stick-off when the user manually changes entry price. */
export function withStickEntryDisabled(drawing: SerializedDrawing): SerializedDrawing {
  if (!isPositionDrawingName(drawing.name)) return drawing;
  if (drawing.styles?.stickEntryToLastPrice === false) return drawing;
  return {
    ...drawing,
    styles: { ...drawing.styles, stickEntryToLastPrice: false },
  };
}

export function entryValueChanged(
  before: SerializedDrawing['points'],
  after: SerializedDrawing['points'],
): boolean {
  const a = before[0]?.value;
  const b = after[0]?.value;
  if (a == null || b == null) return a !== b;
  return Math.abs(a - b) >= 1e-12;
}

export type PositionOrderLevelsPatch = {
  entry: number;
  stop: number;
  target: number;
};

function directionFromPositionName(name: string): RiskDirection | null {
  if (name === 'long_position') return 'long';
  if (name === 'short_position') return 'short';
  return null;
}

function validPositionOrderLevels(
  direction: RiskDirection,
  entry: number,
  stop: number,
  target: number,
): boolean {
  if (
    !Number.isFinite(entry) ||
    !Number.isFinite(stop) ||
    !Number.isFinite(target)
  ) {
    return false;
  }
  const riskDist = Math.abs(entry - stop);
  const rewardDist = Math.abs(target - entry);
  if (
    riskDist < MIN_POSITION_PRICE_DELTA ||
    rewardDist < MIN_POSITION_PRICE_DELTA
  ) {
    return false;
  }
  if (direction === 'long') {
    return stop < entry && target > entry;
  }
  return stop > entry && target < entry;
}

/**
 * Apply typed entry/stop/target prices to a four-point position drawing.
 * Returns null when levels are invalid for the tool direction.
 * Manual entry edits persist stick-off via `withStickEntryDisabled`.
 */
export function applyPositionOrderLevels(
  drawing: SerializedDrawing,
  levels: PositionOrderLevelsPatch,
): SerializedDrawing | null {
  if (!isPositionDrawingName(drawing.name) || drawing.points.length < 4) {
    return null;
  }
  const direction = directionFromPositionName(drawing.name);
  if (!direction) return null;

  const { entry, stop, target } = levels;
  if (!validPositionOrderLevels(direction, entry, stop, target)) {
    return null;
  }

  const before = drawing.points;
  const points = drawing.points.map((p, i) => {
    switch (i) {
      case 0:
      case 3:
        return { ...p, value: entry };
      case 1:
        return { ...p, value: stop };
      case 2:
        return { ...p, value: target };
      default:
        return { ...p };
    }
  });

  let next: SerializedDrawing = { ...drawing, points };
  if (entryValueChanged(before, points)) {
    next = withStickEntryDisabled(next);
  }
  return next;
}

export type PositionPlotBounds = {
  leftX: number;
  rightX: number;
  entryY: number;
  stopY: number;
  targetY: number;
};

/** Minimum price distance between entry and stop/target (avoids collapsed boxes). */
export const MIN_POSITION_PRICE_DELTA = 0.01;

/**
 * Integer R multiples that fit inside the profit zone (1R .. floor(reward/risk)).
 */
export function profitRLevels(
  entry: number,
  stop: number,
  target: number,
  direction: RiskDirection,
): PositionRLevel[] {
  const risk = Math.abs(entry - stop);
  if (risk <= 0 || !Number.isFinite(risk)) return [];

  const reward = Math.abs(target - entry);
  const maxR = Math.min(Math.floor(reward / risk), MAX_POSITION_R_LEVELS);
  if (maxR < 1) return [];

  const levels: PositionRLevel[] = [];
  for (let r = 1; r <= maxR; r++) {
    levels.push({
      r,
      price: targetPriceForRMultiple(entry, stop, direction, r),
    });
  }
  return levels;
}

function validDrawingTimestamp(t: number | undefined | null): number | null {
  return t != null && t !== 0 && Number.isFinite(t) ? t : null;
}

export function boxFromPoints(
  points: SerializedDrawing['points'],
  direction: RiskDirection,
): PositionBox | null {
  if (points.length < 2) return null;
  const entry = points[0]?.value;
  if (entry == null || !Number.isFinite(entry)) return null;

  if (points.length >= 4) {
    const stop = points[1]?.value;
    const target = points[2]?.value;
    const leftTs = validDrawingTimestamp(points[0]?.timestamp);
    const rightTs = validDrawingTimestamp(points[3]?.timestamp);
    const leftTimestamp = leftTs ?? rightTs ?? 0;
    const rightTimestamp = rightTs ?? leftTs ?? leftTimestamp;
    if (
      stop == null ||
      target == null ||
      !Number.isFinite(stop) ||
      !Number.isFinite(target)
    ) {
      return null;
    }
    return { entry, stop, target, leftTimestamp, rightTimestamp };
  }

  const corner = points[1];
  if (corner?.value == null || !Number.isFinite(corner.value)) return null;

  const t0 = validDrawingTimestamp(points[0]?.timestamp);
  const t1 = validDrawingTimestamp(corner.timestamp);
  let leftTimestamp: number;
  let rightTimestamp: number;
  if (t0 != null && t1 != null) {
    leftTimestamp = Math.min(t0, t1);
    rightTimestamp = Math.max(t0, t1);
  } else if (t0 != null || t1 != null) {
    const only = (t0 ?? t1)!;
    leftTimestamp = only;
    rightTimestamp = only;
  } else {
    leftTimestamp = 0;
    rightTimestamp = 0;
  }
  const riskDist = Math.max(Math.abs(corner.value - entry), MIN_POSITION_PRICE_DELTA);

  if (direction === 'long') {
    const stop = Math.min(entry - riskDist, corner.value, entry);
    const target = Math.max(entry + riskDist * 2, corner.value, entry);
    return {
      entry,
      stop: Math.min(stop, entry - MIN_POSITION_PRICE_DELTA),
      target: Math.max(target, entry + MIN_POSITION_PRICE_DELTA),
      leftTimestamp,
      rightTimestamp,
    };
  }

  const stop = Math.max(entry + riskDist, corner.value, entry);
  const target = Math.min(entry - riskDist * 2, corner.value, entry);
  return {
    entry,
    stop: Math.max(stop, entry + MIN_POSITION_PRICE_DELTA),
    target: Math.min(target, entry - MIN_POSITION_PRICE_DELTA),
    leftTimestamp,
    rightTimestamp,
  };
}

/** Default target R when no policy Geometry is available. */
export const DEFAULT_POSITION_TARGET_R_MULTIPLE = 2;

/**
 * Keep stop/target on the correct side of entry after CP drag or stick apply.
 */
export function clampPositionPoints(
  points: SerializedDrawing['points'],
  direction: RiskDirection,
): SerializedDrawing['points'] {
  if (points.length < 4) return points;
  const entry = points[0]?.value;
  if (entry == null || !Number.isFinite(entry)) return points;

  let stop = points[1]?.value ?? entry;
  let target = points[2]?.value ?? entry;

  if (direction === 'long') {
    if (stop >= entry - MIN_POSITION_PRICE_DELTA) {
      stop = entry - MIN_POSITION_PRICE_DELTA;
    }
    if (target <= entry + MIN_POSITION_PRICE_DELTA) {
      target = entry + MIN_POSITION_PRICE_DELTA;
    }
  } else {
    if (stop <= entry + MIN_POSITION_PRICE_DELTA) {
      stop = entry + MIN_POSITION_PRICE_DELTA;
    }
    if (target >= entry - MIN_POSITION_PRICE_DELTA) {
      target = entry - MIN_POSITION_PRICE_DELTA;
    }
  }

  return points.map((p, i) => {
    if (i === 1) return { ...p, value: stop };
    if (i === 2) return { ...p, value: target };
    if (i === 0) return { ...p, value: entry };
    if (i === 3) return { ...p, value: entry };
    return p;
  });
}

/**
 * Four anchors from a chart click (TradingView one-click place):
 * - entry + left edge = click
 * - stop/target from bar range at click (or pct floor)
 * - width = DEFAULT_POSITION_WIDTH_BARS
 */
export function positionPointsFromClick(
  direction: RiskDirection,
  click: DrawingPoint,
  candles: Candle[],
  targetRMultiple: number = DEFAULT_POSITION_TARGET_R_MULTIPLE,
): DrawingPoint[] | null {
  const entry = click.value;
  if (entry == null || !Number.isFinite(entry)) return null;
  if (candles.length === 0) return null;

  const lastDi = candles.length - 1;
  let leftDi = click.dataIndex ?? lastDi;
  if (!Number.isFinite(leftDi) || leftDi < 0) leftDi = lastDi;
  const barDi = Math.min(Math.max(0, leftDi), lastDi);
  const bar = candles[barDi]!;

  const barRange = Math.abs(bar.h - bar.l);
  const pctRisk = Math.abs(entry) * DEFAULT_POSITION_RISK_PCT;
  const riskDist = Math.max(barRange, pctRisk, MIN_POSITION_PRICE_DELTA);
  const rightDi = leftDi + DEFAULT_POSITION_WIDTH_BARS;
  const leftTs =
    click.timestamp != null && click.timestamp !== 0 && Number.isFinite(click.timestamp)
      ? click.timestamp
      : timestampForDataIndex(candles, barDi);
  const rightTs = timestampForDataIndex(candles, rightDi);

  const targetR =
    Number.isFinite(targetRMultiple) && targetRMultiple > 0
      ? targetRMultiple
      : DEFAULT_POSITION_TARGET_R_MULTIPLE;
  const stop =
    direction === 'long' ? entry - riskDist : entry + riskDist;
  const target =
    direction === 'long' ? entry + riskDist * targetR : entry - riskDist * targetR;

  return [
    { timestamp: leftTs, value: entry, dataIndex: leftDi },
    { timestamp: leftTs, value: stop, dataIndex: leftDi },
    { timestamp: leftTs, value: target, dataIndex: leftDi },
    { timestamp: rightTs, value: entry, dataIndex: rightDi },
  ];
}

/**
 * Default long/short anchors at the live edge:
 * - entry = last bar close
 * - left edge = last bar index (xForIndex = bar slot left)
 * - stop/target from last-bar range (or 0.5% of price)
 * - right edge = left + DEFAULT_POSITION_WIDTH_BARS (may be virtual)
 */
export function defaultPositionPoints(
  direction: RiskDirection,
  candles: Candle[],
  targetRMultiple: number = DEFAULT_POSITION_TARGET_R_MULTIPLE,
): DrawingPoint[] | null {
  if (candles.length === 0) return null;
  const leftDi = candles.length - 1;
  const last = candles[leftDi]!;
  const entry = last.c;
  if (!Number.isFinite(entry)) return null;

  const barRange = Math.abs(last.h - last.l);
  const pctRisk = Math.abs(entry) * DEFAULT_POSITION_RISK_PCT;
  const riskDist = Math.max(barRange, pctRisk, MIN_POSITION_PRICE_DELTA);
  const rightDi = leftDi + DEFAULT_POSITION_WIDTH_BARS;
  const leftTs = timestampForDataIndex(candles, leftDi);
  const rightTs = timestampForDataIndex(candles, rightDi);

  const targetR =
    Number.isFinite(targetRMultiple) && targetRMultiple > 0
      ? targetRMultiple
      : DEFAULT_POSITION_TARGET_R_MULTIPLE;
  const stop =
    direction === 'long' ? entry - riskDist : entry + riskDist;
  const target =
    direction === 'long' ? entry + riskDist * targetR : entry - riskDist * targetR;

  return [
    { timestamp: leftTs, value: entry, dataIndex: leftDi },
    { timestamp: leftTs, value: stop, dataIndex: leftDi },
    { timestamp: leftTs, value: target, dataIndex: leftDi },
    { timestamp: rightTs, value: entry, dataIndex: rightDi },
  ];
}

/**
 * Repair legacy/corrupt position anchors before plot:
 * - timestamp 0 → extrapolate from dataIndex (or last bar)
 * - missing-timestamp left anchors (0–2) must not sit past the series
 */
export function repairPositionPoints(
  points: SerializedDrawing['points'],
  candles: Candle[],
): SerializedDrawing['points'] {
  if (points.length === 0 || candles.length === 0) return points;
  const lastDi = candles.length - 1;
  let changed = false;
  const next = points.map((p, i) => {
    let di = p.dataIndex;
    let ts = p.timestamp;
    const missingTs = ts == null || ts === 0 || !Number.isFinite(ts);
    if (missingTs) {
      if (di == null || !Number.isFinite(di) || di < 0) {
        di = lastDi;
      }
      // Left edge anchors should sit on a real bar, not empty-margin virtual slots.
      if (i < 3 && di > lastDi) {
        di = lastDi;
      }
      ts = timestampForDataIndex(candles, di);
      changed = true;
      return { ...p, timestamp: ts, dataIndex: di };
    }
    return p;
  });
  return changed ? next : points;
}

/** Expand a two-point draft into four persisted anchors. */
export function expandTwoPointDraft(
  draft: SerializedDrawing,
  direction: RiskDirection,
): SerializedDrawing {
  const box = boxFromPoints(draft.points, direction);
  if (!box) return draft;
  const p0 = draft.points[0]!;
  const p1 = draft.points[1] ?? p0;
  const i0 = p0.dataIndex ?? 0;
  const i1 = p1.dataIndex ?? i0;
  const leftDi = Math.min(i0, i1);
  const rightDi = Math.max(i0, i1);
  const leftTs =
    box.leftTimestamp !== 0
      ? box.leftTimestamp
      : (i0 <= i1 ? validDrawingTimestamp(p0.timestamp) : validDrawingTimestamp(p1.timestamp)) ??
        box.leftTimestamp;
  const rightTs =
    box.rightTimestamp !== 0
      ? box.rightTimestamp
      : (i0 <= i1 ? validDrawingTimestamp(p1.timestamp) : validDrawingTimestamp(p0.timestamp)) ??
        box.rightTimestamp;
  return {
    ...draft,
    points: [
      {
        timestamp: leftTs,
        value: box.entry,
        dataIndex: leftDi,
      },
      {
        timestamp: leftTs,
        value: box.stop,
        dataIndex: leftDi,
      },
      {
        timestamp: leftTs,
        value: box.target,
        dataIndex: leftDi,
      },
      {
        timestamp: rightTs,
        value: box.entry,
        dataIndex: rightDi,
      },
    ],
  };
}

export function positionPlotBounds(
  entryPlot: { x: number; y: number },
  stopPlot: { x: number; y: number },
  targetPlot: { x: number; y: number },
  rightPlot: { x: number; y: number },
): PositionPlotBounds {
  return {
    leftX: Math.min(entryPlot.x, rightPlot.x),
    rightX: Math.max(entryPlot.x, rightPlot.x),
    entryY: entryPlot.y,
    stopY: stopPlot.y,
    targetY: targetPlot.y,
  };
}

/**
 * TradingView-style position handles (4):
 * 0 target left  — take-profit price only (vertical)
 * 1 entry left   — entry price + left edge (vertical + horizontal)
 * 2 stop left    — stop price only (vertical)
 * 3 entry right  — right edge only (horizontal; entry price unchanged)
 */
export const POSITION_CP = {
  TARGET: 0,
  ENTRY_LEFT: 1,
  STOP: 2,
  RIGHT: 3,
} as const;

/** Strong-magnet axis for a control point (position left handles are Y-only). */
export function resolveMagnetDragAxisForCp(
  drawingName: string,
  cpIndex: number,
  role?: string,
): MagnetDragAxis {
  if (drawingName === 'long_position' || drawingName === 'short_position') {
    if (
      cpIndex === POSITION_CP.TARGET ||
      cpIndex === POSITION_CP.ENTRY_LEFT ||
      cpIndex === POSITION_CP.STOP
    ) {
      return 'price';
    }
    if (cpIndex === POSITION_CP.RIGHT) {
      return 'time';
    }
  }
  switch (role) {
    case 'price':
      return 'price';
    case 'time':
      return 'time';
    default:
      return 'xy';
  }
}

export function positionControlPoints(
  bounds: PositionPlotBounds,
): Array<{ x: number; y: number; role?: string }> {
  const { leftX, rightX, entryY, stopY, targetY } = bounds;
  return [
    { x: leftX, y: targetY, role: 'price' },
    { x: leftX, y: entryY, role: 'move' },
    { x: leftX, y: stopY, role: 'price' },
    { x: rightX, y: entryY, role: 'time' },
  ];
}

export function updatePositionFromControl(
  d: SerializedDrawing,
  cpIndex: number,
  pt: DrawingPoint,
): SerializedDrawing {
  if (d.points.length < 4) return d;
  const points = d.points.map((p) => ({ ...p }));

  switch (cpIndex) {
    case POSITION_CP.TARGET:
      points[2] = { ...points[2], value: pt.value };
      break;
    case POSITION_CP.ENTRY_LEFT:
      points[0] = {
        ...points[0],
        value: pt.value,
        timestamp: pt.timestamp,
        dataIndex: pt.dataIndex,
      };
      points[1] = { ...points[1], timestamp: pt.timestamp, dataIndex: pt.dataIndex };
      points[2] = { ...points[2], timestamp: pt.timestamp, dataIndex: pt.dataIndex };
      points[3] = { ...points[3], value: pt.value };
      break;
    case POSITION_CP.STOP:
      points[1] = { ...points[1], value: pt.value };
      break;
    case POSITION_CP.RIGHT:
      points[3] = {
        ...points[3],
        timestamp: pt.timestamp,
        value: points[0]!.value,
        dataIndex: pt.dataIndex,
      };
      break;
    default:
      break;
  }

  const direction = directionFromPositionName(d.name);
  if (!direction) return { ...d, points };
  return { ...d, points: clampPositionPoints(points, direction) };
}

export function positionHitTest(
  px: number,
  py: number,
  bounds: PositionPlotBounds,
  direction: RiskDirection,
): boolean {
  const { leftX, rightX, entryY, stopY, targetY } = bounds;
  const minX = Math.min(leftX, rightX);
  const maxX = Math.max(leftX, rightX);

  const topY = direction === 'long' ? targetY : stopY;
  const bottomY = direction === 'long' ? stopY : targetY;
  const boxTop = Math.min(topY, bottomY, entryY);
  const boxBottom = Math.max(topY, bottomY, entryY);

  if (px >= minX - HIT_TOLERANCE_PX && px <= maxX + HIT_TOLERANCE_PX) {
    if (py >= boxTop - HIT_TOLERANCE_PX && py <= boxBottom + HIT_TOLERANCE_PX) {
      return true;
    }
    if (Math.abs(py - entryY) <= HIT_TOLERANCE_PX) {
      return true;
    }
  }
  return false;
}
