import type { SerializedDrawing } from '../contracts';
import type { RiskDirection } from '../risk/riskTypes';
import { boxFromPoints, MIN_POSITION_PRICE_DELTA } from './positionGeometry';

export type PositionRiskUnit = 'percent';

export type PositionSettingsLevels = {
  entry: number;
  stop: number;
  target: number;
};

export type PositionSettingsDraft = PositionSettingsLevels & {
  riskPercent: number;
  riskUnit: PositionRiskUnit;
  tickSize: number;
};

/** Infer a display tick size from entry magnitude (no symbol contract yet). */
export function inferPositionTickSize(price: number): number {
  if (!Number.isFinite(price) || price === 0) return 0.01;
  const abs = Math.abs(price);
  if (abs >= 1000) return 0.25;
  if (abs >= 1) return 0.01;
  if (abs >= 0.01) return 0.0001;
  return 0.00001;
}

export function directionFromPositionDrawing(
  drawing: Pick<SerializedDrawing, 'name'>,
): RiskDirection | null {
  if (drawing.name === 'long_position') return 'long';
  if (drawing.name === 'short_position') return 'short';
  return null;
}

export function ticksBetweenPrices(
  entry: number,
  level: number,
  tickSize: number,
): number {
  if (!(tickSize > 0) || !Number.isFinite(entry) || !Number.isFinite(level)) return 0;
  return Math.max(0, Math.round(Math.abs(level - entry) / tickSize));
}

export function priceFromEntryTicks(
  entry: number,
  ticks: number,
  tickSize: number,
  direction: RiskDirection,
  kind: 'stop' | 'target',
): number {
  const distance = Math.max(0, ticks) * tickSize;
  if (direction === 'long') {
    return kind === 'stop' ? entry - distance : entry + distance;
  }
  return kind === 'stop' ? entry + distance : entry - distance;
}

/** Keep stop/target tick offsets when entry moves. */
export function levelsAfterEntryChange(
  prev: PositionSettingsLevels,
  nextEntry: number,
  tickSize: number,
  direction: RiskDirection,
): PositionSettingsLevels {
  const stopTicks = ticksBetweenPrices(prev.entry, prev.stop, tickSize);
  const targetTicks = ticksBetweenPrices(prev.entry, prev.target, tickSize);
  const stop = priceFromEntryTicks(nextEntry, stopTicks, tickSize, direction, 'stop');
  const target = priceFromEntryTicks(nextEntry, targetTicks, tickSize, direction, 'target');
  return { entry: nextEntry, stop, target };
}

export function readPositionSettingsDraft(
  drawing: SerializedDrawing,
  riskPercentFallback = 1,
): PositionSettingsDraft | null {
  const direction = directionFromPositionDrawing(drawing);
  if (!direction) return null;
  const box = boxFromPoints(drawing.points, direction);
  if (!box) return null;
  const tickSize = inferPositionTickSize(box.entry);
  const riskPercent =
    typeof drawing.styles?.riskPercent === 'number' &&
    Number.isFinite(drawing.styles.riskPercent)
      ? drawing.styles.riskPercent
      : riskPercentFallback;
  return {
    entry: box.entry,
    stop: box.stop,
    target: box.target,
    riskPercent,
    riskUnit: 'percent',
    tickSize,
  };
}

export function formatPositionPrice(price: number, tickSize: number): string {
  if (!Number.isFinite(price)) return '';
  if (tickSize >= 1) return price.toFixed(0);
  if (tickSize >= 0.1) return price.toFixed(1);
  if (tickSize >= 0.01) return price.toFixed(2);
  if (tickSize >= 0.0001) return price.toFixed(4);
  return price.toFixed(5);
}

export function parseFiniteNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function clampMinLevelDistance(
  levels: PositionSettingsLevels,
  direction: RiskDirection,
): PositionSettingsLevels | null {
  const { entry, stop, target } = levels;
  if (
    !Number.isFinite(entry) ||
    !Number.isFinite(stop) ||
    !Number.isFinite(target)
  ) {
    return null;
  }
  const riskDist = Math.abs(entry - stop);
  const rewardDist = Math.abs(target - entry);
  if (riskDist < MIN_POSITION_PRICE_DELTA || rewardDist < MIN_POSITION_PRICE_DELTA) {
    return null;
  }
  if (direction === 'long' && !(stop < entry && target > entry)) return null;
  if (direction === 'short' && !(stop > entry && target < entry)) return null;
  return levels;
}
