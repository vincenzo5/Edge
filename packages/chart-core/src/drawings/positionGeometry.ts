import type { SerializedDrawing } from '../contracts';
import type { DrawingPoint } from '../drawingCoords';
import { targetPriceForRMultiple } from '../risk/riskCompute';
import type { RiskDirection } from '../risk/riskTypes';
import { HIT_TOLERANCE_PX } from './primitives';

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
    const leftTimestamp = points[0]?.timestamp ?? 0;
    const rightTimestamp = points[3]?.timestamp ?? leftTimestamp;
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
  const leftTimestamp = Math.min(points[0]!.timestamp ?? 0, corner.timestamp ?? 0);
  const rightTimestamp = Math.max(points[0]!.timestamp ?? 0, corner.timestamp ?? 0);
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

/** Expand a two-point draft into four persisted anchors. */
export function expandTwoPointDraft(
  draft: SerializedDrawing,
  direction: RiskDirection,
): SerializedDrawing {
  const box = boxFromPoints(draft.points, direction);
  if (!box) return draft;
  const p0 = draft.points[0]!;
  return {
    ...draft,
    points: [
      {
        timestamp: box.leftTimestamp,
        value: box.entry,
        dataIndex: p0.dataIndex,
      },
      {
        timestamp: box.leftTimestamp,
        value: box.stop,
        dataIndex: p0.dataIndex,
      },
      {
        timestamp: box.leftTimestamp,
        value: box.target,
        dataIndex: p0.dataIndex,
      },
      {
        timestamp: box.rightTimestamp,
        value: box.entry,
        dataIndex: draft.points[1]?.dataIndex ?? p0.dataIndex,
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
 * Six control points: top-L/R, entry-L/R, bottom-L/R.
 * Index 0–1 target, 2–3 entry/width, 4–5 stop.
 */
export function positionControlPoints(bounds: PositionPlotBounds): Array<{ x: number; y: number }> {
  const { leftX, rightX, entryY, stopY, targetY } = bounds;
  return [
    { x: leftX, y: targetY },
    { x: rightX, y: targetY },
    { x: leftX, y: entryY },
    { x: rightX, y: entryY },
    { x: leftX, y: stopY },
    { x: rightX, y: stopY },
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
    case 0:
      points[2] = { ...points[2], value: pt.value, timestamp: pt.timestamp, dataIndex: pt.dataIndex };
      points[0] = { ...points[0], timestamp: pt.timestamp, dataIndex: pt.dataIndex };
      points[1] = { ...points[1], timestamp: pt.timestamp, dataIndex: pt.dataIndex };
      break;
    case 1:
      points[2] = { ...points[2], value: pt.value };
      points[3] = {
        ...points[3],
        timestamp: pt.timestamp,
        value: points[0]!.value,
        dataIndex: pt.dataIndex,
      };
      break;
    case 2:
      points[0] = { ...points[0], value: pt.value };
      points[3] = { ...points[3], value: pt.value };
      break;
    case 3:
      points[3] = {
        ...points[3],
        timestamp: pt.timestamp,
        value: points[0]!.value,
        dataIndex: pt.dataIndex,
      };
      break;
    case 4:
      points[1] = { ...points[1], value: pt.value, timestamp: pt.timestamp, dataIndex: pt.dataIndex };
      points[0] = { ...points[0], timestamp: pt.timestamp, dataIndex: pt.dataIndex };
      points[2] = { ...points[2], timestamp: pt.timestamp, dataIndex: pt.dataIndex };
      break;
    case 5:
      points[1] = { ...points[1], value: pt.value };
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

  return { ...d, points };
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
