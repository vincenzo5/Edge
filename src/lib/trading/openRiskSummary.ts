import type { AccountPosition } from "@/lib/marketData/contracts/brokerage";

export function countOpenPositions(positions: AccountPosition[]): number {
  return positions.filter((row) => (row.position ?? 0) !== 0).length;
}

export function sumPositionUnrealized(positions: AccountPosition[]): number | null {
  let sum = 0;
  let any = false;
  for (const row of positions) {
    const pnl = row.unrealizedPNL;
    if (pnl != null && Number.isFinite(pnl)) {
      sum += pnl;
      any = true;
    }
  }
  return any ? sum : null;
}

export function resolveOpenRiskUnrealized(
  positions: AccountPosition[],
  aggregateUnrealized: number | null | undefined,
): number | null {
  if (aggregateUnrealized != null && Number.isFinite(aggregateUnrealized)) {
    return aggregateUnrealized;
  }
  return sumPositionUnrealized(positions);
}

export function formatSignedMoney(value: number | null | undefined, currency = "USD"): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const formatted = Math.abs(value).toLocaleString(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

export function formatOpenRiskChipLabel(count: number, unrealized: number | null): string {
  const countPart = `${count} open`;
  if (unrealized == null) return `${countPart} · —`;
  return `${countPart} · ${formatSignedMoney(unrealized)}`;
}
