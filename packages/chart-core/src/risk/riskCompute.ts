import { formatChange, formatPrice } from '../format';
import type { RiskDirection, RiskMetrics, TargetMetrics, TradeSetup } from './riskTypes';
import { validateTradeSetup } from './riskValidation';

export function inferDirection(entry: number, stop: number): RiskDirection {
  return stop < entry ? 'long' : 'short';
}

export function targetPriceForRMultiple(
  entry: number,
  stop: number,
  direction: RiskDirection,
  rMultiple: number,
): number {
  const riskDistance = Math.abs(entry - stop);
  if (direction === 'long') return entry + riskDistance * rMultiple;
  return entry - riskDistance * rMultiple;
}

export function normalizeTargetAllocations(targets: TradeSetup['targets']): number[] {
  if (targets.length === 0) return [];
  const explicit = targets.every((target) => target.allocationPercent != null);
  if (explicit) {
    return targets.map((target) => target.allocationPercent ?? 0);
  }
  const even = 100 / targets.length;
  return targets.map(() => even);
}

export function computeRiskMetrics(setup: TradeSetup): RiskMetrics {
  const validated = validateTradeSetup(setup);
  const entryPrice = validated.entries[0]!.price;
  const stopPrice = validated.stops[0]!.price;
  const riskPerShare = Math.abs(entryPrice - stopPrice);
  const accountRiskDollars =
    (validated.account.capital * validated.account.riskPercent) / 100;
  const positionSize = Math.floor(accountRiskDollars / riskPerShare);
  const totalRiskDollars = positionSize * riskPerShare;
  const allocations = normalizeTargetAllocations(validated.targets);

  const targets: TargetMetrics[] = validated.targets.map((target, index) => {
    const rewardPerShare = Math.abs(target.price - entryPrice);
    const allocationPercent = allocations[index] ?? 0;
    const allocatedShares = Math.floor((positionSize * allocationPercent) / 100);
    const rewardDollars = allocatedShares * rewardPerShare;
    return {
      index,
      price: target.price,
      rMultiple: target.rMultiple,
      allocationPercent,
      rewardPerShare,
      rewardDollars,
      label: target.label,
    };
  });

  const maxTarget = targets.reduce<TargetMetrics | null>((best, target) => {
    if (!best || target.rMultiple > best.rMultiple) return target;
    return best;
  }, null);

  const riskRewardRatio =
    maxTarget && riskPerShare > 0 ? maxTarget.rMultiple : null;

  return {
    direction: validated.direction,
    entryPrice,
    stopPrice,
    riskPerShare,
    positionSize,
    totalRiskDollars,
    accountRiskDollars,
    riskRewardRatio,
    targets,
  };
}

export function formatRiskSummary(metrics: RiskMetrics): string {
  const rr =
    metrics.riskRewardRatio != null
      ? `${formatPrice(metrics.riskRewardRatio, 1)}R max`
      : '—';
  return `${metrics.positionSize} sh · $${formatPrice(metrics.totalRiskDollars)} risk · ${rr}`;
}

export function formatTargetLabel(target: TargetMetrics): string {
  const pct = formatChange(target.rewardPerShare, 0).split(' ')[0] ?? '';
  return `${target.rMultiple}R @ ${formatPrice(target.price)} (${pct})`;
}
