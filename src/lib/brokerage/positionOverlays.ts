import type { ChartReferenceLine } from "@edge/chart-core";
import type { AccountPosition } from "@/lib/marketData/contracts/brokerage";

function formatMoney(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Build avg-cost reference line for a held position on the active chart symbol. */
export function buildPositionReferenceLines(
  position: AccountPosition | null,
): ChartReferenceLine[] {
  if (!position) return [];
  const avgCost = position.avgCost;
  if (avgCost == null || !Number.isFinite(avgCost)) return [];

  const qty = position.position ?? 0;
  const pnl = position.unrealizedPNL;
  const side = qty >= 0 ? "Long" : "Short";
  const pnlText =
    pnl != null && Number.isFinite(pnl)
      ? `${pnl >= 0 ? "+" : ""}${formatMoney(pnl)}`
      : "";

  return [
    {
      id: `position-avg-cost-${position.contract.conId ?? position.contract.symbol ?? "unknown"}`,
      price: avgCost,
      label: `${side} ${Math.abs(qty)} @ ${formatMoney(avgCost)}${pnlText ? ` (${pnlText})` : ""}`,
      color: qty >= 0 ? "var(--edge-accent-green)" : "var(--edge-accent-red)",
      lineWidth: 1,
      lineDash: [4, 4],
    },
  ];
}
