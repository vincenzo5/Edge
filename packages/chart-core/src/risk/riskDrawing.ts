import type { SerializedDrawing } from '../contracts';
import { distanceToSegment, HIT_TOLERANCE_PX } from '../drawings/primitives';
import {
  DEFAULT_RISK_ACCOUNT,
  DEFAULT_R_MULTIPLES,
  type RiskTarget,
  type TradeSetup,
} from '../risk/riskTypes';
import { inferDirection, targetPriceForRMultiple } from '../risk/riskCompute';

export function buildDefaultTargets(
  entry: number,
  stop: number,
  direction: ReturnType<typeof inferDirection>,
): RiskTarget[] {
  return DEFAULT_R_MULTIPLES.map((rMultiple) => ({
    price: targetPriceForRMultiple(entry, stop, direction, rMultiple),
    rMultiple,
  }));
}

export type RiskChartPoint = Pick<
  import('../contracts').SerializedDrawing['points'][number],
  'timestamp' | 'value' | 'dataIndex'
>;

export function tradeSetupFromPoints(
  points: RiskChartPoint[],
  account = DEFAULT_RISK_ACCOUNT,
): TradeSetup | null {
  if (points.length < 2) return null;
  const entry = points[0]?.value;
  const stop = points[1]?.value;
  if (entry == null || stop == null || !Number.isFinite(entry) || !Number.isFinite(stop)) {
    return null;
  }
  if (entry === stop) return null;

  const direction = inferDirection(entry, stop);
  const explicitTargets = points.slice(2).flatMap((point, index) => {
    if (point.value == null || !Number.isFinite(point.value)) return [];
    const riskDistance = Math.abs(entry - stop);
    const rMultiple =
      riskDistance > 0 ? Math.abs(point.value - entry) / riskDistance : index + 1;
    return [{ price: point.value, rMultiple }];
  });

  const targets =
    explicitTargets.length > 0
      ? explicitTargets
      : buildDefaultTargets(entry, stop, direction);

  return {
    direction,
    account,
    entries: [{ price: entry, label: 'Entry' }],
    stops: [{ price: stop, type: 'initial', label: 'Stop' }],
    targets,
  };
}

export function plotYForPrice(
  price: number,
  entryPrice: number,
  entryY: number,
  stopPrice: number,
  stopY: number,
): number {
  const priceDelta = stopPrice - entryPrice;
  const plotDelta = stopY - entryY;
  if (priceDelta === 0) return entryY;
  const t = (price - entryPrice) / priceDelta;
  return entryY + t * plotDelta;
}

export function riskRulerHitTest(
  px: number,
  py: number,
  entryPlot: { x: number; y: number },
  stopPlot: { x: number; y: number },
  plotWidthPx: number,
  targetYs: number[] = [],
): boolean {
  const zoneTop = Math.min(entryPlot.y, stopPlot.y);
  const zoneBottom = Math.max(entryPlot.y, stopPlot.y);
  if (px >= 0 && px <= plotWidthPx && py >= zoneTop && py <= zoneBottom) {
    return true;
  }

  const bandYs = [entryPlot.y, stopPlot.y, ...targetYs];
  for (const y of bandYs) {
    if (Math.abs(py - y) <= HIT_TOLERANCE_PX && px >= 0 && px <= plotWidthPx) {
      return true;
    }
  }

  return (
    distanceToSegment(px, py, entryPlot.x, entryPlot.y, stopPlot.x, stopPlot.y) <=
    HIT_TOLERANCE_PX
  );
}

export function targetPlotYsForSetup(
  setup: TradeSetup,
  entryPlot: { x: number; y: number },
  stopPlot: { x: number; y: number },
  targetPlots: Array<{ x: number; y: number }>,
): number[] {
  return setup.targets.map((target, index) => {
    const plot = targetPlots[index];
    return (
      plot?.y ??
      plotYForPrice(
        target.price,
        setup.entries[0]!.price,
        entryPlot.y,
        setup.stops[0]!.price,
        stopPlot.y,
      )
    );
  });
}

export function readTradeSetupFromDrawing(drawing: SerializedDrawing): TradeSetup | null {
  const fields = drawing.metadata?.fields;
  const stored = fields?.riskSetup;
  if (stored && typeof stored === 'object') {
    return stored as TradeSetup;
  }
  return tradeSetupFromPoints(drawing.points);
}

export function riskComputedPayload(metrics: ReturnType<typeof import('../risk/riskCompute').computeRiskMetrics>) {
  return {
    positionSize: metrics.positionSize,
    riskPerShare: metrics.riskPerShare,
    totalRiskDollars: metrics.totalRiskDollars,
    accountRiskDollars: metrics.accountRiskDollars,
    riskRewardRatio: metrics.riskRewardRatio ?? 0,
    direction: metrics.direction,
  };
}
