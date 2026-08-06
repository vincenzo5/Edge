import { formatPrice } from '../format';
import type { RiskDirection } from './riskTypes';
import type { PositionBox } from '../drawings/positionGeometry';

export type PositionLabelInput = PositionBox & {
  direction: RiskDirection;
  qty?: number | null;
  lastPrice?: number | null;
};

function pctChange(delta: number, entry: number): number {
  if (entry === 0 || !Number.isFinite(entry)) return 0;
  return (Math.abs(delta) / Math.abs(entry)) * 100;
}

export function computeRiskRewardRatio(box: PositionBox): number {
  const risk = Math.abs(box.entry - box.stop);
  const reward = Math.abs(box.target - box.entry);
  if (risk <= 0) return 0;
  return reward / risk;
}

export function computeOpenPnl(
  entry: number,
  lastPrice: number,
  qty: number,
  direction: RiskDirection,
): number {
  const diff = lastPrice - entry;
  return direction === 'long' ? diff * qty : -diff * qty;
}

export function formatTargetLabel(input: PositionLabelInput): string {
  const delta = Math.abs(input.target - input.entry);
  const pct = pctChange(delta, input.entry);
  const base = `Target: ${formatPrice(delta)} (${formatPrice(pct)}%)`;
  if (input.qty == null || !Number.isFinite(input.qty) || input.qty <= 0) {
    return base;
  }
  const amount = delta * input.qty;
  return `${base} Amount: ${formatPrice(amount)}`;
}

export function formatStopLabel(input: PositionLabelInput): string {
  const delta = Math.abs(input.entry - input.stop);
  const pct = pctChange(delta, input.entry);
  const base = `Stop: ${formatPrice(delta)} (${formatPrice(pct)}%)`;
  if (input.qty == null || !Number.isFinite(input.qty) || input.qty <= 0) {
    return base;
  }
  const amount = delta * input.qty;
  return `${base} Amount: ${formatPrice(amount)}`;
}

export function formatEntryLabels(input: PositionLabelInput): [string, string] {
  const rr = computeRiskRewardRatio(input);
  const qtyLabel =
    input.qty != null && Number.isFinite(input.qty) && input.qty > 0
      ? String(input.qty)
      : '—';
  const lastPrice = input.lastPrice ?? input.entry;
  const pnlLine =
    input.qty != null && Number.isFinite(input.qty) && input.qty > 0
      ? `Open PnL: ${formatPrice(computeOpenPnl(input.entry, lastPrice, input.qty, input.direction))}, Qty: ${qtyLabel}`
      : `Qty: ${qtyLabel}`;
  return [pnlLine, `Risk/reward ratio: ${formatPrice(rr, 1)}`];
}

/** Stored drawing qty only — no computed fallback from DEFAULT_RISK_ACCOUNT. */
export function resolvePositionQtyForDisplay(drawingQty: unknown): number | null {
  if (typeof drawingQty === 'number' && Number.isFinite(drawingQty) && drawingQty > 0) {
    return Math.floor(drawingQty);
  }
  return null;
}

export function resolvePositionQty(
  drawingQty: unknown,
  computedPositionSize: number | undefined,
): number {
  if (typeof drawingQty === 'number' && Number.isFinite(drawingQty) && drawingQty > 0) {
    return Math.floor(drawingQty);
  }
  if (computedPositionSize != null && computedPositionSize > 0) {
    return computedPositionSize;
  }
  return 1;
}
